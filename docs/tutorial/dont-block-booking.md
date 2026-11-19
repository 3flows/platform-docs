---
title: 6. Don't block booking
---

# 6. Don't block booking

**Where we are:** booking stores the appointment and then sends the confirmation SMS, in the same request.

**What we want:** booking that doesn't depend on the SMS provider.

## Where it breaks already

You don't need a slow provider to see it. Book with an empty phone number. It's a string, so the contract lets it through, but the SMS provider can't deliver it:

```sh
yarn step:05
curl -i -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Bob","phone":"","at":"2030-01-01T10:00:00Z"}'
```

```txt
HTTP/1.1 500 Internal Server Error
{ "title": "Internal Server Error", "detail": "Cannot deliver memory SMS without recipient address", … }
```

Now list the appointments: **Bob's is there.** The booking worked, but the caller was told it failed, so it will probably try again and book twice. A slow provider is the same problem in slow motion: every booking waits for it, and when it times out, the customer sees an error for an appointment that exists.

## The obvious way

The customer shouldn't wait for the SMS. So don't wait: drop the `await`.

```ts title="services.ts"
await doc().collection('appointments').by(appointment.id).set(appointment);

// Don't wait for the SMS provider.
sms().to(appointment.phone).body(`Hi ${appointment.name}, …`).send();

await trigger.ok(appointment);
```

Book Ada: the answer comes right away, and the SMS follows.

## Where it breaks

Book Bob with his empty phone number again:

```sh
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Bob","phone":"","at":"2030-01-01T10:00:00Z"}'
# {"name":"Bob","phone":"",…}
curl localhost:3000/health
# curl: (7) Failed to connect to localhost port 3000
```

Bob gets `200`, and then **the whole server is gone.** The failed `send()` is a promise nobody waits for. Its rejection is unhandled, and Node.js ends the process on unhandled rejections. One bad SMS took down booking for everyone. Wrapping it in `.catch()` keeps the server up, but then the confirmation is silently lost, and a restart in the middle loses every SMS that was still in flight.

## The concept: `mq`

Booking publishes an event and answers. The SMS moves out of the request into a **queue route**, which the platform runs and whose errors it owns:

```ts title="services.ts"
handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
    // highlight-next-line
    const { doc, mq } = trigger.context;
    const appointment: Appointment = { id: randomUUID(), ...input };

    await doc().collection('appointments').by(appointment.id).set(appointment);
    // highlight-start
    // Don't wait for the SMS provider: publish an event and answer right away.
    await mq().queue('appointment-booked').send(appointment);
    // highlight-end

    await trigger.ok(appointment);
}),
```

```ts title="services.ts"
// inside routes()
route.mq().queue('appointment-booked').do(async (appointment, trigger) => {
    const { name, phone, at } = appointment as Appointment;
    await trigger.context.sms().to(phone).body(`Hi ${name}, your appointment on ${at} is confirmed.`).send();
    trigger.context.log().stack(`Confirmation SMS sent to ${phone}`).info();
});

// What arrives in a dead-letter queue: the message, how often its route was tried, and why it failed.
type FailedConfirmation = {
    message: { correspondenceID: string; content: { data: Appointment } };
    attempts: number;
    failedAt: string;
    error: { message: string };
};

// Confirmations that failed every attempt arrive here, with the error. Nothing is lost silently.
route.mq().queue('appointment-booked.failed').do(async (failure, trigger) => {
    const { message, attempts, failedAt, error } = failure as FailedConfirmation;
    const appointment = message.content.data;
    trigger.context.log().stack(`Confirmation for ${appointment.name} failed ${attempts} times: ${error.message}`).warn();
    await trigger.context
        .doc()
        .collection('failed_confirmations')
        .by(message.correspondenceID)
        .set({ appointment, attempts, failedAt, error: error.message });
});
```

```yaml title="platform.yml"
mqs:
  - name: DEFAULT
    type: memory
    use:
      - AppointmentsService
    routes:
      appointment-booked:
        # A confirmation that fails is retried, then moved aside. It never fails the booking.
        retry: { attempts: 3, backoffMs: 200 }
        dlq: { queue: appointment-booked.failed }
```

`use` attaches the service's queue routes to this message queue. `routes` says what happens when the route of a queue throws: the message is tried three times, and then moved to the dead-letter queue `appointment-booked.failed`, together with the error. The second route consumes that queue: it logs the failure and keeps it in `docs`.

## Run it again

```sh
yarn step:06
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Bob","phone":"","at":"2030-01-01T10:00:00Z"}'
# {"name":"Bob","phone":"",…}
curl localhost:3000/health
# OK
```

Booking answers `200` without waiting, and the server stays up. Book Ada, and her confirmation arrives as before.

Bob's confirmation wasn't lost, either. The log says what happened to it, and it's in `failed_confirmations` with its error:

```txt
[WARN] … AppointmentsService • Confirmation for Bob failed 3 times: Cannot deliver memory SMS without recipient address
```

The failure is now the queue's problem, not the booking request's. That's the point of the change: the API stays up, and the customer gets an answer.

## What happens to Bob's confirmation

A queue route that throws **fails the delivery**. What that means is decided in YAML, not in the route:

| `mqs[].routes.<queue>` | A route that throws |
|---|---|
| `retry.attempts`, `retry.backoffMs` | Runs again, up to `attempts` times, waiting `backoffMs` in between |
| `dlq.queue` | After the last attempt, the message goes to that queue as `{ queue, message, attempts, failedAt, error }`, and the delivery counts as done |
| Nothing | The error is logged (`MQ route appointment-booked failed for message …`) and handed to the broker: RabbitMQ rejects the message, Service Bus abandons it for redelivery |

A dead-letter queue is an ordinary queue, and the route that consumes it is an ordinary route. Give every dead-letter queue one: a broker keeps what arrives until somebody looks, but the `memory` queue doesn't keep messages of a queue without a route.

:::note
The `memory` queue delivers a message inside `send()`. Without `dlq`, the publisher would get the route's error, and Bob's booking would answer `500` again. A real broker never does that: `send()` returns when the broker has the message.
:::

## What you learned

- **Async work is just another route.** Publishing is one line, consuming is a route.
- HTTP handlers, timer routes and queue routes all look the same.
- **What happens to a failed message is configuration:** `retry` and `dlq` per queue.
- A dead-letter queue needs a route that keeps what arrives.
- Never "fire and forget" a promise in a service. A queue is the way to not wait.

## Reviewer's view

> Booking stores the appointment and publishes `appointment-booked`. A queue route sends the confirmation SMS. A confirmation that fails three times is logged and kept in `failed_confirmations`.

The review question: *who looks at `failed_confirmations`?*

[Sample: step 06](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/06-async-with-queues) · Next: [A notifications service](./notifications-service.md)

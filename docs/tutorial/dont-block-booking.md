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
```

```yaml title="platform.yml"
mqs:
  - name: DEFAULT
    type: memory
    use:
      - AppointmentsService
```

`use` attaches the service's queue routes to this message queue.

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

The failure is now the queue's problem, not the booking request's. That's the point of the change: the API stays up, and the customer gets an answer.

:::caution Known gap
Today, a queue route that throws **loses the message silently, on every broker**. The handler's error is caught before it reaches the broker, so RabbitMQ acknowledges the message and Service Bus completes it, and nothing is logged. Until that's fixed, keep queue routes small, and make anything that must not be lost go through a mechanism that keeps failures: [dead letters](./dead-letters.md) for pipelines in Part 3, and retries with a dead-letter queue for connector events in [Part 4](./slack.md).
:::

## What you learned

- **Async work is just another route.** Publishing is one line, consuming is a route.
- HTTP handlers, timer routes and queue routes all look the same.
- Never "fire and forget" a promise in a service. A queue is the way to not wait.

## Reviewer's view

> Booking stores the appointment and publishes `appointment-booked`. A queue route sends the confirmation SMS.

[Sample: step 06](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/06-async-with-queues) · Next: [A notifications service](./notifications-service.md)

---
title: 7. A notifications service
---

# 7. A notifications service

**Where we are:** one `AppointmentsService` books appointments, runs reminders, publishes events and sends SMS.

**What we want:** notifications as a responsibility of their own. Later they'll need email, templates and opt-outs, and they shouldn't be tangled with booking.

## The obvious way

Move the SMS code into its own module and import it:

```ts title="notifications.ts"
export async function sendConfirmation({ sms }: TriggerContext, { name, phone, at }: Appointment) {
    await sms().to(phone).body(`Hi ${name}, your appointment on ${at} is confirmed.`).send();
}

export async function sendReminder({ sms }: TriggerContext, { name, phone, at }: Appointment) {
    await sms().to(phone).body(`Reminder: ${name}, your appointment is on ${at}.`).send();
}
```

```ts title="services.ts"
import { sendConfirmation, sendReminder } from './notifications.js';
// …
await sendReminder(trigger.context, appointment);
```

The code is tidier, and it works.

## Where it breaks

Nothing breaks today. The problem is what you can't do:

- Notifications run **wherever booking runs**. An `import` is a hard wire: you can't deploy or scale notifications on their own, or give only them the SMS credentials, without rewriting every call into an HTTP client with a URL, retries and error handling.
- There's no boundary. Nothing says which functions are notification's API and which are internals, and nothing validates what goes across.
- The queue route that sends confirmations still belongs to `AppointmentsService`.

## The concept: services call services by name

`NotificationsService` is a service of its own, with handlers and contracts like any other:

```ts title="notifications.ts"
@Register()
export class NotificationsService extends Service {
    handlers = () => [
        // Accept the event quickly; the SMS is sent asynchronously from the queue.
        handler('appointmentBooked', Appointment, t.object({ queued: t.boolean() }), async (appointment, trigger) => {
            await trigger.context.mq().queue('confirmations').send(appointment);
            await trigger.ok({ queued: true });
        }),

        handler('sendReminder', Appointment, t.object({ sent: t.boolean() }), async ({ name, phone, at }, trigger) => {
            await trigger.context.sms().to(phone).body(`Reminder: ${name}, your appointment is on ${at}.`).send();
            await trigger.ok({ sent: true });
        }),

        // Shows what the SMS provider delivered; handy with the memory provider.
        handler('outbox', t.object({}).optional(), t.any(), async (_input, trigger) => {
            await trigger.ok(await trigger.context.sms().info());
        })
    ];

    routes(): Route {
        const route = super.routes();
        route.mq().queue('confirmations').do(async (appointment, trigger) => {
            const { name, phone, at } = appointment as Appointment;
            await trigger.context.sms().to(phone).body(`Hi ${name}, your appointment on ${at} is confirmed.`).send();
        });
        return route;
    }
}
```

`AppointmentsService` no longer knows anything about SMS. It calls the notifications service **by name**, and imports nothing from it:

```ts title="appointments.ts"
handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
    const { doc, service } = trigger.context;
    const appointment: Appointment = { id: randomUUID(), ...input };

    await doc().collection('appointments').by(appointment.id).set(appointment);
    // highlight-next-line
    await service('NotificationsService').method('appointmentBooked').input(appointment).call();

    await trigger.ok(appointment);
}),
```

and, in the reminder run:

```ts title="appointments.ts"
await service('NotificationsService').method('sendReminder').input(appointment).call();
```

The shared schemas, `BookAppointment` and `Appointment`, move into `model.ts`.

```yaml title="platform.yml"
services:
  - name: AppointmentsService
  # highlight-next-line
  - name: NotificationsService

mqs:
  - name: DEFAULT
    type: memory
    use:
      # highlight-next-line
      - NotificationsService   # the queue routes now belong to notifications
```

## Run it

```sh
yarn step:07
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

Ada is confirmed as before. The call goes through `appointmentBooked`'s contract: an appointment without a phone number is refused at the boundary of notifications, not deep inside it.

## What you learned

- Services call each other with `service(name).method(...).input(...).call()`.
- **That call doesn't care where the other service runs.** Today it's the same process. In [Part 6](./separate-processes.md), notifications moves to a process of its own, and not a single call site changes.

## Reviewer's view

> Appointments stores data and decides *when* to notify. Notifications decides *how*.

Each service is small enough to review on its own.

[Sample: step 07](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/07-notifications-service) · Next: [Part 2: Entities](./entities.md)

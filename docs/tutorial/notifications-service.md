---
title: 7. A notifications service
---

# 7. A notifications service

**Where we are:** one `AppointmentsService` books appointments, runs reminders, publishes events and sends SMS.

**The problem:** it's doing too much. Notifications are their own responsibility, and later we'll want email, templates and opt-outs. They deserve their own service.

## The solution: two services and one call API

`NotificationsService` owns everything about SMS:

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

`AppointmentsService` no longer knows anything about SMS. It calls the notifications service by name:

```ts title="appointments.ts"
handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
    const { doc, service } = trigger.context;
    const appointment: Appointment = { id: randomUUID(), ...input };

    await doc().collection('appointments').by(appointment.id).set(appointment);
    await service('NotificationsService').method('appointmentBooked').input(appointment).call();

    await trigger.ok(appointment);
}),
```

and, in the reminder run:

```ts title="appointments.ts"
await service('NotificationsService').method('sendReminder').input(appointment).call();
```

```yaml title="platform.yml"
services:
  - name: AppointmentsService
  - name: NotificationsService

mqs:
  - name: DEFAULT
    type: memory
    use:
      - NotificationsService   # the queue routes now belong to notifications
```

## What you learned

- Services call each other with `service(name).method(...).input(...).call()`.
- **That call doesn't care where the other service runs.** Keep that in mind: [Part 5](./separate-processes.md) comes back to it.

## Reviewer's view

> Appointments stores data and decides *when* to notify. Notifications decides *how*.

Each service is small enough to review on its own.

[Sample: step 07](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/07-notifications-service) · Next: [Part 2: Entities](./entities.md)

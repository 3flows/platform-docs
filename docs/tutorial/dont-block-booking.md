---
title: 6. Don't block booking
---

# 6. Don't block booking

**Where we are:** booking stores the appointment and sends the confirmation SMS in the same request.

**The problem:** SMS providers can be slow or temporarily unavailable. Then booking becomes slow, or fails even though the appointment could be stored. The customer shouldn't wait for the SMS provider.

## The solution: `mq`

Booking publishes an event and answers right away. A queue route sends the SMS.

```diff title="services.ts"
 handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
-    const { doc, sms } = trigger.context;
+    const { doc, mq } = trigger.context;
     const appointment: Appointment = { id: randomUUID(), ...input };

     await doc().collection('appointments').by(appointment.id).set(appointment);
-    await sms()
-        .to(appointment.phone)
-        .body(`Hi ${appointment.name}, your appointment on ${appointment.at} is confirmed.`)
-        .send();
+    // Don't wait for the SMS provider: publish an event and answer right away.
+    await mq().queue('appointment-booked').send(appointment);

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

```diff title="platform.yml"
+mqs:
+  - name: DEFAULT
+    type: memory
+    use:
+      - AppointmentsService
```

`use` attaches the service's queue routes to this message queue. In production, `type: rabbitmq` or `type: azure` (Service Bus) gives you a durable broker with retries. Same code.

## What you learned

- **Async work is just another route.** Publishing is one line, and consuming is a route.
- HTTP handlers, timer routes and queue routes all look the same.

## Reviewer's view

> Booking stores the appointment and publishes `appointment-booked`. A queue route sends the confirmation SMS.

[Sample: step 06](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/06-async-with-queues) · Next: [A notifications service](./notifications-service.md)

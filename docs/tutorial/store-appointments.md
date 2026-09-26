---
title: 2. Store appointments
---

# 2. Store appointments

**Where we are:** we can book and list appointments, but they live in an array.

**The problem:** the data disappears on restart and isn't shared between instances.

## The solution: `docs`

Appointments are documents, so we use the `docs` primitive.

```diff title="services.ts"
 handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
     const appointment: Appointment = { id: randomUUID(), ...input };
-    this.appointments.push(appointment);
+    await trigger.context.doc().collection('appointments').by(appointment.id).set(appointment);
     await trigger.ok(appointment);
 }),

 handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
-    await trigger.ok(this.appointments);
+    const appointments = await trigger.context.doc().collection('appointments').find({}).all<Appointment>();
+    await trigger.ok(appointments);
 })
```

Then tell the platform that this application needs a document store:

```diff title="platform.yml"
+docs:
+  - name: DEFAULT
+    type: memory
```

## Swap the database without touching code

`memory` is ideal for development and tests. For production, change the YAML:

```yaml
docs:
  - name: DEFAULT
    type: mongo
    parameters:
      connectionString: ${{ MONGO_URL }}
```

The service code stays exactly the same. PostgreSQL works the same way.

## What you learned

- **Infrastructure comes from configuration, not from code.**
- Services reach infrastructure through `trigger.context`: `doc()`, `kv()`, `blob()`, `mq()`, `sms()` and more.

## Reviewer's view

> Booking writes one document to the `appointments` collection. Listing reads that collection.

There's no database driver, no connection handling and no credentials in application code. The implementation behind `docs` is the one that has already been hardened in production.

[Sample: step 02](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/02-store-appointments) · Next: [Confirm by SMS](./confirm-by-sms.md)

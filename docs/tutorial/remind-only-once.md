---
title: 5. Remind only once
---

# 5. Remind only once

**Where we are:** a timer sends reminders for appointments in the next 24 hours.

**The problem:** every timer run reminds the same customers again.

## The solution: `kv`

We need to remember one small fact per appointment: *has it been reminded?* That's the job of a key-value store.

```diff title="services.ts"
-async function sendDueReminders({ doc, sms, log }: TriggerContext): Promise<number> {
+async function sendDueReminders({ doc, kv, sms, log }: TriggerContext): Promise<number> {
     const appointments = await doc().collection('appointments').find({}).all<Appointment>();
-    const due = appointments.filter((appointment) => isDueForReminder(appointment));
+    let sent = 0;

-    for (const appointment of due) {
+    for (const appointment of appointments.filter((appointment) => isDueForReminder(appointment))) {
+        const reminded = kv().bracket('reminded').key(appointment.id);
+        if (await reminded.exists()) continue;
+
         await sms()
             .to(appointment.phone)
             .body(`Reminder: ${appointment.name}, your appointment is on ${appointment.at}.`)
             .send();
+        await reminded.set(new Date().toISOString());
+
         log().stack(`Reminder SMS sent to ${appointment.phone}`).info();
+        sent++;
     }
-    return due.length;
+    return sent;
 }
```

```diff title="platform.yml"
+kvs:
+  - name: DEFAULT
+    type: memory
```

A `bracket` groups related keys, like a namespace. For production, `type: redis` or `type: memcached` gives you a shared store without changing code.

## Run it

```sh
npm run step:05
# book an appointment as in the previous chapter, then:
curl -X POST localhost:3000/sendDueReminders   # {"sent":1}
curl -X POST localhost:3000/sendDueReminders   # {"sent":0}
```

## What you learned

- Use `docs` for business data and `kv` for small state such as flags and markers.
- Picking the right primitive is part of the design. The platform makes the choice explicit and readable.

## Reviewer's view

> A reminder is sent only if `reminded/<appointmentId>` doesn't exist yet. After sending, the marker is set.

[Sample: step 05](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/05-remember-reminders) · Next: [Don't block booking](./dont-block-booking.md)

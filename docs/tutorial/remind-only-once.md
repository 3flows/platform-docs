---
title: 5. Remind only once
---

# 5. Remind only once

**Where we are:** a timer sends reminders for appointments in the next 24 hours.

**What we want:** every customer gets *one* reminder, not one per minute.

## The obvious way

Remember who was reminded. A `Set` on the service:

```ts title="services.ts"
const reminded = new Set<string>();

async function sendDueReminders({ doc, sms }: TriggerContext): Promise<number> {
    let sent = 0;
    for (const appointment of /* due appointments */) {
        if (reminded.has(appointment.id)) continue;
        await sms().to(appointment.phone).body(/* … */).send();
        reminded.add(appointment.id);
        sent++;
    }
    return sent;
}
```

Call `sendDueReminders` twice: the first call sends one reminder, the second sends none. It works.

## Where it breaks

It's [chapter 2](./store-appointments.md) again, one level down. The `Set` lives in the process:

- **Deploy at 09:00.** The appointments are in MongoDB and survive. The `Set` doesn't. The first timer tick after the deployment reminds **every** customer with an appointment in the next 24 hours, for the second time.
- **Run two instances.** Each has its own `Set`, so each customer is reminded once per instance.

The fact *"Ada has been reminded"* is data. It needs a home outside the process, just like the appointment.

## The concept: `kv`

It's one small fact per appointment, not a document. That's the job of a key-value store:

```ts title="services.ts"
// highlight-next-line
async function sendDueReminders({ doc, kv, sms, log }: TriggerContext): Promise<number> {
    const appointments = await doc().collection('appointments').find({}).all<Appointment>();
    // highlight-next-line
    let sent = 0;

    for (const appointment of appointments.filter((appointment) => isDueForReminder(appointment))) {
        // highlight-start
        const reminded = kv().bracket('reminded').key(appointment.id);
        if (await reminded.exists()) continue;
        // highlight-end

        await sms()
            .to(appointment.phone)
            .body(`Reminder: ${appointment.name}, your appointment is on ${appointment.at}.`)
            .send();
        // highlight-next-line
        await reminded.set(new Date().toISOString());

        log().stack(`Reminder SMS sent to ${appointment.phone}`).info();
        // highlight-next-line
        sent++;
    }
    // highlight-next-line
    return sent;
}
```

```yaml title="platform.yml"
kvs:
  - name: DEFAULT
    type: memory
```

A `bracket` groups related keys, like a namespace. For production, `type: redis` or `type: memcached` gives every instance the same store, and it survives deployments. Same code.

## Run it again

```sh
yarn step:05
# book an appointment for tomorrow, as in the previous chapter, then:
curl -X POST localhost:3000/sendDueReminders   # {"sent":1}
curl -X POST localhost:3000/sendDueReminders   # {"sent":0}
```

With `kv` on Redis, a deployment or a second instance changes nothing: the marker is where every instance looks.

## What you learned

- Use `docs` for business data and `kv` for small state such as flags and markers.
- Picking the right primitive is part of the design. The platform makes the choice explicit and readable.

## Reviewer's view

> A reminder is sent only if `reminded/<appointmentId>` doesn't exist yet. After sending, the marker is set.

[Sample: step 05](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/05-remember-reminders) · Next: [Don't block booking](./dont-block-booking.md)

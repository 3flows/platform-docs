---
title: 4. Send reminders
---

# 4. Send reminders

**Where we are:** booking stores the appointment and sends a confirmation.

**The problem:** customers forget their appointments. We want to remind them in the 24 hours before.

## The solution: a timer

First, the reminder logic. It's a plain function that works with whatever context it's given:

```ts title="services.ts"
const DAY = 24 * 60 * 60 * 1000;

/** Appointments in the next 24 hours get a reminder. */
function isDueForReminder(appointment: Appointment, now = Date.now()): boolean {
    const at = new Date(appointment.at).getTime();
    return at > now && at - now <= DAY;
}

async function sendDueReminders({ doc, sms, log }: TriggerContext): Promise<number> {
    const appointments = await doc().collection('appointments').find({}).all<Appointment>();
    const due = appointments.filter((appointment) => isDueForReminder(appointment));

    for (const appointment of due) {
        await sms()
            .to(appointment.phone)
            .body(`Reminder: ${appointment.name}, your appointment is on ${appointment.at}.`)
            .send();
        log().stack(`Reminder SMS sent to ${appointment.phone}`).info();
    }
    return due.length;
}
```

Then connect it to a timer route. We also expose it as a handler so you can trigger it by hand:

```ts title="services.ts"
// inside AppointmentsService
handler('sendDueReminders', t.object({}).optional(), t.object({ sent: t.number() }), async (_input, trigger) => {
    await trigger.ok({ sent: await sendDueReminders(trigger.context) });
})

routes(): Route {
    const route = super.routes();
    route.timer('reminders').do(async (_params, trigger) => {
        await sendDueReminders(trigger.context);
    });
    return route;
}
```

The schedule lives in YAML:

```yaml title="platform.yml"
timers:
  - service: AppointmentsService
    name: reminders
    cron: '0 * * * * *' # every minute, so you can watch it locally
    runImmediatly: false
```

In production you'd probably run it hourly. That's a YAML change.

## Run it

```sh
npm run step:04
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d "{\"name\":\"Ada\",\"phone\":\"+15550000001\",\"at\":\"$(date -u -v+20H +%Y-%m-%dT%H:%M:%SZ)\"}"
curl -X POST localhost:3000/sendDueReminders
```

On Linux, use `date -u -d '+20 hours' +%Y-%m-%dT%H:%M:%SZ`.

:::info
At startup you'll see a warning that the timer runs locally in every platform instance. That's fine for now. It matters once you run several instances, which a later chapter on scaling out covers.
:::

## What you learned

- **Time is just another trigger.** Timer routes look exactly like other routes.
- The schedule is configuration, not code.

## The catch

Call `sendDueReminders` again, or wait for the next timer tick. **Ada gets the same reminder again.** And again, every minute, until her appointment. Our timer has no memory.

[Sample: step 04](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/04-reminder-timer) · Next: [Remind only once](./remind-only-once.md)

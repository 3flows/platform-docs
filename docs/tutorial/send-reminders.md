---
title: 4. Send reminders
---

# 4. Send reminders

**Where we are:** booking stores the appointment and sends a confirmation.

**What we want:** customers forget their appointments. Remind them in the 24 hours before.

First, the reminder logic. It's a plain function that works with whatever context it's given, so it doesn't care what calls it:

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

Now it has to run regularly.

## The obvious way

`setInterval`, started with the service:

```ts title="services.ts"
@Register()
export class AppointmentsService extends Service {
    reminders = setInterval(() => sendDueReminders(this.getServiceContext() as TriggerContext), 60_000);
    // …
}
```

Start it, book an appointment for tomorrow morning, wait a minute: Ada gets her reminder.

## Where it breaks

Run the tests:

```sh
yarn test
```

They pass, and then **the test run never ends.** `Platform.shutdown()` stops every service it knows about, but it doesn't know about your interval, and an active interval keeps Node.js alive. The interval keeps firing after shutdown, against a platform that's no longer running. In CI, the job hangs until it times out.

And there's more:

- The schedule is in code. *"Hourly in production, every minute while I watch"* means a code change.
- Nobody can see it. It's not in the configuration, not in the admin API, not in the logs until it fires.
- Two instances of the service run it twice. (Hold that thought until [Part 6](./separate-processes.md).)

## The concept: timers

Time is just another trigger. A **timer route** looks like any other route, and the platform starts and stops it with the service:

```ts title="services.ts"
// inside AppointmentsService
routes(): Route {
    const route = super.routes();
    // highlight-start
    route.timer('reminders').do(async (_params, trigger) => {
        await sendDueReminders(trigger.context);
    });
    // highlight-end
    return route;
}
```

We also expose the run as a handler, so you can trigger it by hand and tests don't have to wait for the clock:

```ts title="services.ts"
handler('sendDueReminders', t.object({}).optional(), t.object({ sent: t.number() }), async (_input, trigger) => {
    await trigger.ok({ sent: await sendDueReminders(trigger.context) });
})
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

## Run it again

```sh
yarn step:04
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d "{\"name\":\"Ada\",\"phone\":\"+15550000001\",\"at\":\"$(date -u -v+20H +%Y-%m-%dT%H:%M:%SZ)\"}"
curl -X POST localhost:3000/sendDueReminders
```

On Linux, use `date -u -d '+20 hours' +%Y-%m-%dT%H:%M:%SZ`.

The log shows the reminder, and again at the next full minute. `yarn test` runs, passes and **exits**, because the timer stops with the platform.

:::info
At startup you'll see a warning that the timer runs locally in every platform instance. That's the *"two instances run it twice"* problem from above. The platform knows about it because the timer is configuration, not code. The fix is a coordinator; see [singleton timers](../guides/singleton-timers.md).
:::

## What you learned

- **Time is just another trigger.** Timer routes look like other routes and live and die with the platform.
- The schedule is configuration, not code.

## Reviewer's view

> Every minute, `reminders` texts customers whose appointment is in the next 24 hours. `sendDueReminders` does the same on demand.

## The catch

Call `sendDueReminders` again, or wait for the next tick. **Ada gets the same reminder again.** And again, every minute, until her appointment. The timer has no memory.

[Sample: step 04](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/04-reminder-timer) · Next: [Remind only once](./remind-only-once.md)

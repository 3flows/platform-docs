---
title: 3. Confirm by SMS
---

# 3. Confirm by SMS

**Where we are:** appointments are stored in `docs`.

**What we want:** the customer gets a text message confirming the booking.

## The obvious way

Call the SMS provider's REST API. With Twilio, that's one `fetch` after the appointment is stored:

```ts title="services.ts"
const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token } = process.env;

await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
    body: new URLSearchParams({
        From: '+15550009999',
        To: appointment.phone,
        Body: `Hi ${appointment.name}, your appointment on ${appointment.at} is confirmed.`
    })
});
```

With a Twilio account and the two variables set, it works.

## Where it breaks

Run it on a laptop without the variables: Twilio answers `401`, `fetch` doesn't throw on that, and nobody notices that nothing was sent. Run it *with* the variables and every test run, every demo and every developer's experiment texts a real phone, and costs money. To test it, you mock `fetch`. To switch providers, you rewrite it. And the provider's credentials are now something the booking code has to know about.

## The concept: `sms`

SMS is a platform primitive, like `docs`. The handler says *what* to send, YAML says *through which provider*:

```ts title="services.ts"
handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
    // highlight-next-line
    const { doc, sms, log } = trigger.context;
    const appointment: Appointment = { id: randomUUID(), ...input };

    await doc().collection('appointments').by(appointment.id).set(appointment);

    // highlight-start
    await sms()
        .to(appointment.phone)
        .body(`Hi ${appointment.name}, your appointment on ${appointment.at} is confirmed.`)
        .send();
    log().stack(`Confirmation SMS sent to ${appointment.phone}`).info();
    // highlight-end

    await trigger.ok(appointment);
}),
```

```yaml title="platform.yml"
smss:
  - name: DEFAULT
    type: memory
```

The `memory` provider doesn't send real messages. It keeps them in a mailbox per phone number, which is exactly what development and tests need. For production, `type: twilio` with its parameters. [Chapter 23](./vaults.md) gets those parameters from a vault.

## Run it

```sh
yarn step:03
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

The log shows:

```txt
[INFO] ... AppointmentsService • Confirmation SMS sent to +15550000001
```

Nobody's phone buzzed, and the sample's test reads the memory mailbox to check that exactly one confirmation went to Ada.

## What you learned

- External channels use the same fluent style as storage: `sms().to(...).body(...).send()`.
- Development and tests need no accounts, no credentials and no mocks. Production is a YAML change.

## Reviewer's view

> Booking stores one document and sends one SMS to the booked phone number.

## The catch

Booking now waits for the SMS provider. Keep that in mind: it becomes a problem in [chapter 6](./dont-block-booking.md).

[Sample: step 03](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/03-sms-confirmation) · Next: [Send reminders](./send-reminders.md)

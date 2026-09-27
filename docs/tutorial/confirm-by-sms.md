---
title: 3. Confirm by SMS
---

# 3. Confirm by SMS

**Where we are:** appointments are stored in `docs`.

**The problem:** the customer doesn't know whether the booking worked.

## The solution: `sms`

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

The `memory` SMS provider doesn't send real messages. It keeps them in a local mailbox per phone number, which is perfect for development and tests. For production, switch the `type` to a real provider such as `twilio` and add its parameters.

## Run it

```sh
npm run step:03
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

The log shows:

```txt
[INFO] ... AppointmentsService • Confirmation SMS sent to +15550000001
```

## What you learned

- External channels use the same fluent style as storage: `sms().to(...).body(...).send()`.
- Development needs no accounts or credentials.

## Reviewer's view

> Booking stores one document and sends one SMS to the booked phone number.

[Sample: step 03](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/03-sms-confirmation) · Next: [Send reminders](./send-reminders.md)

---
title: 2. Store appointments
---

# 2. Store appointments

**Where we are:** `bookAppointment` and `listAppointments` with contracts. Appointments live in `this.appointments`, an array.

**What we want:** appointments that are still there tomorrow.

## The obvious way

That's the array from the last chapter. It's the obvious way to keep data in any Node.js service, and it works as long as the process runs.

## Where it breaks

```sh
yarn step:01
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
curl -X POST localhost:3000/listAppointments    # [ { "name": "Ada", … } ]
```

Stop it with Ctrl+C, start it again and list:

```sh
yarn step:01
curl -X POST localhost:3000/listAppointments    # []
```

Ada's appointment is gone. Every deployment, crash and autoscaling event loses data, and two instances behind a load balancer each have their own list: book on one, list on the other, and it's not there.

The obvious fix is a database driver: `npm install mongodb`, a connection string, a client, connection handling, and a mock for the tests. That puts infrastructure into the service, and every service does it slightly differently.

## The concept: `docs`

Appointments are documents, so we use the platform's `docs` primitive. The array goes away. Both handlers use `docs` instead:

```ts title="services.ts"
handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
    const appointment: Appointment = { id: randomUUID(), ...input };
    // highlight-next-line
    await trigger.context.doc().collection('appointments').by(appointment.id).set(appointment);
    await trigger.ok(appointment);
}),

handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
    // highlight-start
    const appointments = await trigger.context.doc().collection('appointments').find({}).all<Appointment>();
    await trigger.ok(appointments);
    // highlight-end
})
```

Then tell the platform that this application needs a document store:

```yaml title="platform.yml"
docs:
  - name: DEFAULT
    type: memory
```

`trigger.context` is how a handler reaches infrastructure: `doc()`, `kv()`, `blob()`, `mq()`, `sms()`, `sql()`, `vault()` and more. Which implementation is behind it is configuration.

## Run it again

With `type: memory`, the store lives in the process, too, so a restart still empties it. That's what you want in development and tests: every run starts clean, and there's nothing to install.

The difference is that the data no longer lives in **your service**. Change one line of YAML and it lives in MongoDB:

```yaml title="platform.yml"
docs:
  - name: DEFAULT
    # highlight-start
    type: mongo
    parameters:
      connectionString: ${{ MONGO_URL }}
    # highlight-end
```

If you have Docker, try it:

```sh
docker run -d -p 27017:27017 mongo
export MONGO_URL=mongodb://localhost:27017
yarn step:02
# book Ada, stop, start again:
curl -X POST localhost:3000/listAppointments    # [ { "name": "Ada", … } ]
```

Ada survives the restart, and a second instance with the same YAML sees her too. The service code didn't change. PostgreSQL works the same way, with `type: postgres`.

A connection string with a password in it is a secret. For now it comes from an environment variable; [chapter 23](./vaults.md) takes it from a vault instead.

## What you learned

- **Infrastructure comes from configuration, not from code.** The service says *"store this document"*. YAML says where.
- `memory` providers make development and tests free of setup. Production providers are a YAML change.

## Reviewer's view

> Booking writes one document to the `appointments` collection. Listing reads that collection.

There's no database driver, no connection handling and no credentials in application code. The implementation behind `docs` is the one that has already been hardened in production.

[Sample: step 02](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/02-store-appointments) · Next: [Confirm by SMS](./confirm-by-sms.md)

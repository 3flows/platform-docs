---
title: 1. Book an appointment
---

# 1. Book an appointment

**Where we are:** a service that says hello.

**The problem:** we need a real API to book and list appointments.

## The solution

Describe the data once, as schemas. Then add two handlers.

```ts title="services.ts"
import { randomUUID } from 'node:crypto';
import { Register, Service, handler, t } from '@3flows/platform';

const BookAppointment = t.object({
    name: t.string(),
    phone: t.string(),
    at: t.string().describe('ISO date-time of the appointment')
});

const Appointment = BookAppointment.extend({ id: t.string() });
type Appointment = t.infer<typeof Appointment>;

@Register()
export class AppointmentsService extends Service {
    // Problem: this list lives in memory of this one instance and is lost on restart.
    appointments: Appointment[] = [];

    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const appointment = { id: randomUUID(), ...input };
            this.appointments.push(appointment);
            await trigger.ok(appointment);
        }),

        handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
            await trigger.ok(this.appointments);
        })
    ];
}
```

The YAML is unchanged.

## Run it

```sh
npm run step:01
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
curl -X POST localhost:3000/listAppointments
```

Invalid input, such as a missing `phone`, is rejected by the input schema before your code runs.

## What you learned

- Handlers map directly to HTTP endpoints and JSON-RPC methods.
- Schemas document and validate your API in one place. They also show up in `/openapi.json`.

## The catch

Restart the process and every appointment is gone. If you run two instances, each one has its own list. The data needs a proper home.

[Sample: step 01](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/01-book-appointment) · Next: [Store appointments](./store-appointments.md)

---
title: 1. Book an appointment
---

# 1. Book an appointment

**Where we are:** a service that says hello.

**What we want:** an API to book and list appointments.

## The obvious way

Take whatever the client sends, give it an ID and keep it. Schemas can come later, so for now both handlers say `t.any()`:

```ts title="services.ts"
import { randomUUID } from 'node:crypto';
import { Register, Service, handler, t } from '@3flows/platform';

@Register()
export class AppointmentsService extends Service {
    appointments: any[] = [];

    handlers = () => [
        handler('bookAppointment', t.any(), t.any(), async (input, trigger) => {
            const appointment = { id: randomUUID(), ...input };
            this.appointments.push(appointment);
            await trigger.ok(appointment);
        }),

        handler('listAppointments', t.any(), t.any(), async (_input, trigger) => {
            await trigger.ok(this.appointments);
        })
    ];
}
```

Run it and book Ada:

```sh
yarn step:01   # or yarn start in your own project
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

```json
{ "id": "3c4e…", "name": "Ada", "phone": "+15550000001", "at": "2030-01-01T10:00:00Z" }
```

It works.

## Where it breaks

Now book the way a hurried front end or a script would:

```sh
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Bob","at":"tomorrow"}'
```

`200 OK`. Bob is stored without a phone number, at a time called *tomorrow*. Nothing complains today. In a few chapters, the reminder code computes `new Date('tomorrow')`, gets `NaN`, and tries to text `undefined`. The bug shows up far away from where it came in, and every piece of code that reads an appointment has to defend itself against data like this.

`t.any()` also says nothing to the people and tools calling the API: the OpenAPI description, the JSON-RPC schema and, later, an AI assistant all see *"anything goes"*.

## The concept: handler contracts

A handler declares what it accepts and what it returns. The platform **enforces both**. Describe the data once:

```ts title="services.ts"
import { randomUUID } from 'node:crypto';
import { Register, Service, handler, t } from '@3flows/platform';

// highlight-start
const BookAppointment = t.object({
    name: t.string(),
    phone: t.string(),
    at: t.string().datetime().describe('Start of the appointment, ISO 8601, e.g. 2030-01-15T10:00:00Z')
});

const Appointment = BookAppointment.extend({ id: t.string() });
type Appointment = t.infer<typeof Appointment>;
// highlight-end

@Register()
export class AppointmentsService extends Service {
    // Problem: this list lives in memory of this one instance and is lost on restart.
    appointments: Appointment[] = [];

    handlers = () => [
        // highlight-next-line
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const appointment = { id: randomUUID(), ...input };
            this.appointments.push(appointment);
            await trigger.ok(appointment);
        }),

        // highlight-next-line
        handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
            await trigger.ok(this.appointments);
        })
    ];
}
```

`t` is [Zod](https://zod.dev). `input` is now typed as `{ name: string; phone: string; at: string }`, so TypeScript catches mistakes in the handler, too.

| Contract | Checked | When it fails |
|---|---|---|
| Input schema | Before your handler runs | `400`, `INVALID_INPUT`. Your code never sees the request |
| Output schema | In `trigger.ok(...)` | `500`, `INVALID_OUTPUT`. A malformed answer never leaves the service |

## Run it again

```sh
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Bob","at":"tomorrow"}'
```

```json
{
  "type": "about:blank",
  "title": "INVALID_INPUT",
  "status": 400,
  "detail": "Invalid input for handler bookAppointment",
  "instance": "/bookAppointment"
}
```

Bob isn't stored. JSON-RPC callers get the same contract, with the details of what's wrong:

```sh
curl -X POST localhost:3000/.jsonrpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"bookAppointment","params":{"name":"Bob","at":"tomorrow"}}'
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid input for handler bookAppointment",
    "data": {
      "name": "ZodError",
      "message": "[{ \"path\": [\"phone\"], \"message\": \"Invalid input: expected string, received undefined\" … }, { \"path\": [\"at\"], \"message\": \"Invalid ISO datetime\" … }]"
    }
  }
}
```

The output contract protects the other direction. If a later change made the handler answer `{ identifier: … }` instead of `{ id: … }`, callers would get `500 INVALID_OUTPUT` instead of a response that silently breaks them.

## What you learned

- **Every boundary has a contract.** Handlers declare input and output, and the platform enforces both, for HTTP and JSON-RPC alike.
- Bad requests fail early, at the edge, with a structured error, not three features later.
- The same schemas document the API. `/openapi.json` shows `at` as `format: date-time`, and later chapters reuse them for GraphQL, MCP and the runtime manifest.

## Reviewer's view

> `bookAppointment` takes a name, a phone number and an ISO date-time, and returns the appointment with its ID. `listAppointments` takes nothing and returns all appointments.

The schemas are the review. The handler bodies are two lines each.

## The catch

Stop the process with Ctrl+C and start it again. `listAppointments` returns `[]`. And if you ran two instances behind a load balancer, each would have its own list.

[Sample: step 01](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/01-book-appointment) · Next: [Store appointments](./store-appointments.md)

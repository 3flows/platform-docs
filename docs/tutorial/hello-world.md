---
title: 0. Hello World
---

# 0. Hello World

**Where we are:** an empty project that starts the platform, from [Set up a project](./setup.md). Or the samples, if you just want to run the steps.

**Goal:** see how little it takes to run a service. There's no problem to solve yet. Every later chapter starts with one.

## The code

A service is a class. A handler is a named function with an input schema and an output schema.

```ts title="services.ts"
import { Register, Service, handler, t } from '@3flows/platform';

@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler(
            'hello',
            t.object({ name: t.string() }),
            t.object({ message: t.string() }),
            async ({ name }, trigger) => {
                await trigger.ok({ message: `Hello ${name}, welcome to appointment reminders!` });
            }
        )
    ];
}
```

## The configuration

YAML decides what runs and how it's exposed.

```yaml title="platform.yml"
name: appointment-reminders

services:
  - name: AppointmentsService

https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService
```

- `services` starts the service.
- `https` exposes its handlers over HTTP on port 3000.

## Start it

```ts title="main.ts"
import { Platform } from '@3flows/platform';
import './services.js';

await Platform.run('./steps/00-hello-world/platform.yml');
```

That's the path in the samples, where every step has its own folder. In a project from [Set up a project](./setup.md), it's `./platform.yml`, and `main.ts` gets one new line: `import './services.js';`.

## Run it

```sh
yarn step:00
curl -X POST localhost:3000/hello -H 'Content-Type: application/json' -d '{"name":"Ada"}'
```

```json
{ "message": "Hello Ada, welcome to appointment reminders!" }
```

Every handler is also available through JSON-RPC at `POST /.jsonrpc`, and the platform adds `/health`, `/metrics` and `/openapi.json` for free.

## What you learned

- **Code lives in services, and YAML decides what runs.**
- `@Register()` makes a class available to YAML.
- Handlers declare their input and output with `t` (Zod) and answer with `trigger.ok(...)`. The [next chapter](./book-an-appointment.md) shows why those two schemas matter.

## Reviewer's view

One class, one handler, one HTTP server. There's nothing else to review.

[Sample: step 00](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/00-hello-world) · Next: [Book an appointment](./book-an-appointment.md)

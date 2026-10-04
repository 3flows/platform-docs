# Services and routes

Services contain application behavior. Handlers and routes connect that behavior to triggers such as HTTP requests, JSON-RPC calls, queue messages, timers, email, SMS, webhooks and connector events.

## Service registration

```ts
@Register()
class AppointmentsService extends Service {}
```

Enable it in YAML:

```yaml
services:
  - name: AppointmentsService
```

## Handlers

Handlers are named functions with input and output schemas. They're exposed over HTTP (`POST /<name>`), over JSON-RPC (`POST /.jsonrpc`), and to other services through `service(name).method(...)`.

```ts
handlers = () => [
    handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
        await trigger.ok({ id: randomUUID(), ...input });
    })
];
```

## Contracts

A handler's input and output schemas are **contracts**, and the platform enforces both:

| Contract | Checked | On failure |
|---|---|---|
| Input | Before the handler runs. The handler receives the parsed, typed input | HTTP `400` with `title: INVALID_INPUT`; JSON-RPC error code `INVALID_INPUT` with the validation issues |
| Output | In `trigger.ok(...)` | HTTP `500` with `title: INVALID_OUTPUT`. The malformed answer is never sent |

The errors are `InputValidationError` and `OutputValidationError`, both `PlatformError`s with a `code`, a `status` and `details`.

The same schemas describe the handler everywhere: in `/openapi.json`, in `rpc.schema`, in GraphQL, as MCP tool input schemas, and in the runtime manifest. `t` is [Zod](https://zod.dev).

:::note
For handlers exposed through GraphQL, use plain Zod types: `t.string().datetime()` works, Zod 4 format types such as `t.iso.datetime()` don't yet.
:::

## Routes

Routes connect other trigger types. Override `routes()`:

```ts
routes(): Route {
    const route = super.routes();

    route.http().get('/appointments/:id').do(async (params, trigger) => { /* ... */ });
    route.mq().queue('appointment-booked').do(async (message, trigger) => { /* ... */ });
    route.timer('reminders').do(async (_params, trigger) => { /* ... */ });
    route.sms().anyFrom().to('+15550000001').do(async (sms, trigger) => { /* ... */ });
    route.connector('reception').event('reaction.added').do(async (event, trigger) => { /* ... */ });

    return route;
}
```

## Trigger context

Every handler and route receives a `Trigger`. Use `trigger.context` to reach infrastructure and other services:

```ts
const { doc, kv, blob, mq, sms, email, sql, vault, log, service, connector } = trigger.context;
```

Using the trigger context, rather than `this` or global lookups, keeps handlers independent of the service instance and easy to test.

Source-specific data is also available, for example `trigger.context.mqContext?.message` for queue routes. `trigger.context.identity` says who called: the user, or, for calls between processes, the calling workload. See [`identities`](../configuration/identities.md).

## Queue and connector routes

Queue routes and connector routes are delivered through `mqs`. The service needs an `mqs[].use` entry:

```yaml
mqs:
  - name: DEFAULT
    type: memory
    use:
      - ReceptionService
```

Connector routes get retries and a dead-letter queue from the connector's configuration. See [Connectors](./connectors.md).

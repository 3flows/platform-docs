# Services and routes

Services contain application behavior. Handlers and routes connect that behavior to triggers such as HTTP requests, JSON-RPC calls, queue messages, timers, email, SMS and webhooks.

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

## Routes

Routes connect other trigger types. Override `routes()`:

```ts
routes(): Route {
    const route = super.routes();

    route.http().get('/appointments/:id').do(async (params, trigger) => { /* ... */ });
    route.mq().queue('appointment-booked').do(async (message, trigger) => { /* ... */ });
    route.timer('reminders').do(async (_params, trigger) => { /* ... */ });
    route.sms().anyFrom().to('+15550000001').do(async (sms, trigger) => { /* ... */ });

    return route;
}
```

## Trigger context

Every handler and route receives a `Trigger`. Use `trigger.context` to reach infrastructure and other services:

```ts
const { doc, kv, blob, mq, sms, email, log, service } = trigger.context;
```

Using the trigger context, rather than `this` or global lookups, keeps handlers independent of the service instance and easy to test.

Source-specific data is also available, for example `trigger.context.mqContext?.message` for queue routes.

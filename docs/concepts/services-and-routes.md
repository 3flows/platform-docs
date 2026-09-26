# Services and routes

Services contain application behavior. Routes expose that behavior to triggers such as HTTP requests, MQ messages, timers, email, SMS, and webhooks.

## Service registration

```ts
@Register()
class OrdersService extends Service {}
```

Then enable it in YAML:

```yaml
services:
  - name: OrdersService
```

## Routes

A service defines routes by overriding `routes()`.

```ts
routes(): Route {
  const route = super.routes();

  route.http().post('/orders').do(this.createOrder);
  route.mq().queue('orders.created').do(this.handleOrderCreated);
  route.timer('cleanup').do(this.cleanup);

  return route;
}
```

## Trigger context

Route handlers receive a `Trigger` object. The trigger exposes context for the route source.

```ts
route.mq().queue('orders.created').do(async (params, trigger) => {
  const message = trigger.context.mqContext?.message;
  return trigger.ok();
});
```

## Service context

Services can access configured infrastructure through context helpers:

```ts
this.kv()
this.mq()
this.email()
this.sms()
this.timer()
this.service('OtherService')
this.services()
```

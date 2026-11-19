# `mqs`

The `mqs` section configures message queue providers.

```yaml
mqs:
  - name: DEFAULT
    type: memory
    use:
      - OrdersService
    routes:
      orders.created:
        retry:
          attempts: 3
          backoffMs: 1000
        dlq:
          queue: orders.created.failed
```

## Fields

| Field | Required | Description |
|---|---:|---|
| `name` | no | Provider name. Defaults to `DEFAULT` in common configurations |
| `type` | no | `memory`, `rabbitmq` or `azure` (Service Bus). Defaults to `memory` |
| `use` | no | Services whose MQ routes should be attached |
| `parameters` | no | Provider-specific parameters |
| `routes` | no | What happens when a route throws, per queue or topic name. See [Retry and dead letters](#retry-and-dead-letters) |

## Queue route

```ts
route.mq().queue('orders.created').do(async (params, trigger) => {
  const message = trigger.context.mqContext?.message;
});
```

## Topic route

```ts
route.mq().topic('events', 'orders.*').do(async (params, trigger) => {
  const message = trigger.context.mqContext?.message;
});
```

## Retry and dead letters

A route that throws fails the delivery. `routes` says what happens then, per queue or topic name:

| Field | Default | Description |
|---|---|---|
| `routes.<name>.retry.attempts` | `1` | How often the route runs for one message |
| `routes.<name>.retry.backoffMs` | `0` | Wait between attempts |
| `routes.<name>.dlq.queue` | | Queue for messages that failed every attempt. The delivery then counts as done |

Without `dlq`, the error is logged (`MQ route orders.created failed for message …`) and handed to the provider:

| Provider | A failed delivery |
|---|---|
| `rabbitmq` | The message is rejected without requeueing. A dead-letter exchange on the queue receives it |
| `azure` | The message is abandoned, and Service Bus delivers it again, up to the queue's maximum delivery count |
| `memory` | The message is kept in the queue's `info().failed`, and `send()` rejects with the route's error, because the memory queue delivers inside `send()` |

A dead-letter message contains the original message and the error:

```json
{
  "queue": "orders.created",
  "message": { "correspondenceID": "…", "content": { "data": { "id": "order-1" } }, … },
  "attempts": 3,
  "failedAt": "2026-10-04T20:57:51.000Z",
  "error": { "name": "Error", "message": "…", "stack": "…" }
}
```

A dead-letter queue is an ordinary queue. Consume it with a queue route that stores or reports what arrives, as in [chapter 6](../tutorial/dont-block-booking.md) of the tutorial. The `memory` provider doesn't keep messages of a queue that has no route.

A route can also handle its own errors with `route.mq().queue(name).do(fn).error((trigger, error) => …)`. An error that's handled there doesn't fail the delivery.

## Idempotency

When `idempotencies.DEFAULT` exists, MQ routes skip duplicates using the route and MQ message `correspondenceID`.

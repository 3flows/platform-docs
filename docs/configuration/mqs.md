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
| `type` | no | Provider type, for example `memory` |
| `use` | no | Services whose MQ routes should be attached |
| `parameters` | no | Provider-specific parameters |
| `routes` | no | Queue route policies keyed by queue name |

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

Route policies are keyed by queue name:

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

If the route throws, the platform retries it up to `retry.attempts`. If every attempt fails and `dlq.queue` is set, a failure envelope is sent to that queue. Without a DLQ, the failure is rethrown to the provider/listener.

## Idempotency

When `idempotencies.DEFAULT` exists, MQ routes skip duplicates using the route and MQ message `correspondenceID`.

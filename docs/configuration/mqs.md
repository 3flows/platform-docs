# `mqs`

The `mqs` section configures message queue providers.

```yaml
mqs:
  - name: DEFAULT
    type: memory
    use:
      - OrdersService
```

## Fields

| Field | Required | Description |
|---|---:|---|
| `name` | no | Provider name. Defaults to `DEFAULT` in common configurations |
| `type` | no | Provider type, for example `memory` |
| `use` | no | Services whose MQ routes should be attached |
| `parameters` | no | Provider-specific parameters |

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

## Idempotency

When `idempotencies.DEFAULT` exists, MQ routes skip duplicates using the route and MQ message `correspondenceID`.

# MQ idempotency

MQ systems can redeliver messages. The platform can skip duplicates when an idempotency store is configured.

## Configure MQ and idempotency

```yaml
services:
  - name: OrdersService

idempotencies:
  - name: DEFAULT
    type: memory

mqs:
  - name: DEFAULT
    type: memory
    use:
      - OrdersService
```

## Route

```ts
route.mq().queue('orders.created').do(async (params, trigger) => {
  const message = trigger.context.mqContext?.message;
  // process message once per route + correspondenceID
});
```

## Duplicate key

The default key is:

```txt
mq:<route>:<correspondenceID>
```

If the same message is delivered again after successful processing, the handler is skipped.

## Without idempotency

If no `idempotencies.DEFAULT` store exists, duplicates are processed normally.

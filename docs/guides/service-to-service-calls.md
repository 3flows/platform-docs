# Service-to-service calls

Services call other services through the service client API.

```ts
const result = await this.service('PaymentsService').call('charge', {
  orderId: 'order-1',
  amount: 100
});
```

## Why use the service client?

The call can resolve locally or remotely without changing the caller.

Resolution order:

1. Local service
2. Static `remotes`
3. Discovery registry

## Local setup

```yaml
services:
  - name: OrdersService
  - name: PaymentsService
```

The call resolves in-process.

## Static remote setup

```yaml
services:
  - name: OrdersService

remotes:
  services:
    PaymentsService:
      url: http://127.0.0.1:3001
```

The same service code now calls `PaymentsService` remotely.

## Discovery setup

Use registries and discovery when remote locations should not be statically wired into every consumer.

See [Distributed platform](./distributed-platform.md).

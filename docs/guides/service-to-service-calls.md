# Service-to-service calls

Services call other services through the service client on the trigger context.

```ts
const result = await trigger.context
    .service('PaymentsService')
    .method('charge')
    .input({ orderId: 'order-1', amount: 100 })
    .call<{ status: string }>();
```

`method` must be the name of a handler on the target service.

## Resolution order

The call is the same whether the target runs locally or remotely. The platform resolves the target in this order:

1. A local service with that name
2. A static `remotes` entry
3. The discovery registry, if [discovery](../concepts/discovery.md) is configured

## Local

```yaml
services:
  - name: OrdersService
  - name: PaymentsService
```

The call runs in-process.

## Static remote

```yaml
services:
  - name: OrdersService

remotes:
  - name: PaymentsService
    url: http://127.0.0.1:3001/.jsonrpc
```

The same code now calls `PaymentsService` over JSON-RPC. The remote platform must expose the service through `https`.

| Field | Description |
|---|---|
| `name` | Service name used in `service(name)` |
| `url` | JSON-RPC endpoint of the remote platform |
| `headers` | Optional HTTP headers |
| `timeout` | Optional timeout in milliseconds |

## Discovery

Use registries and discovery when remote locations shouldn't be wired statically into every consumer. See [Distributed platform](./distributed-platform.md).

The [tutorial chapter on separate processes](../tutorial/separate-processes.md) shows a complete, runnable example.

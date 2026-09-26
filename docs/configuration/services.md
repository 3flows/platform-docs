# `services`

The `services` section starts application services.

```yaml
services:
  - name: OrdersService
  - name: PaymentsService
```

A service must be registered in TypeScript:

```ts
@Register()
class OrdersService extends Service {}
```

## Fields

| Field | Required | Description |
|---|---:|---|
| `name` | yes | Registered service class name |

## Notes

Infrastructure such as registries, coordinators, idempotency stores, MQs, and HTTP servers should not be placed in `services`. They have their own top-level configuration sections.

# Configuration overview

Platform configuration is YAML. The configuration file describes which services and infrastructure should run in a platform instance.

```yaml
name: orders platform

services:
  - name: OrdersService

https:
  - name: api
    port: 3000
    services:
      - name: OrdersService
```

## Common sections

| Section | Purpose |
|---|---|
| `services` | Application services |
| `https` | HTTP servers and exposed service routes |
| `graphqls` | GraphQL endpoints |
| `mqs` | Message queues and topics |
| `timers` | Cron-like timer triggers |
| `registries` | Service registration and lookup |
| `discovery` | Automatic registration/resolution through registries |
| `coordinators` | Distributed leases and ownership |
| `idempotencies` | Duplicate suppression for async triggers |
| `remotes` | Static remote service endpoints |
| `runtime` | Runtime metadata |
| `triggering` | Trigger behavior and strictness defaults |

## Naming

Most infrastructure sections support a `name`. If omitted, many providers use `DEFAULT`.

```yaml
mqs:
  - name: DEFAULT
    type: memory
```

Services can then use the default provider:

```ts
this.mq().queue('orders').send({ id: 'order-1' });
```

---
sidebar_position: 1
---

# Introduction

`@3flows/platform` is a TypeScript application platform for building services, routes, workflows, and infrastructure-backed triggers from YAML configuration.

The platform is designed to let the same application run in two modes:

- **single process** during local development or simple deployments
- **distributed** across multiple platform instances using remotes, registry-backed discovery, coordinators, and idempotency

## What the platform provides

- Service registration and lifecycle management
- HTTP, GraphQL, MQ, timer, email, SMS, webhook, and flow routes
- Service-to-service calls that can resolve locally or remotely
- First-class infrastructure such as KV stores, document stores, blob stores, MQs, registries, coordinators, and idempotency stores
- Coordinator-backed singleton timers
- Optional default duplicate suppression for MQ, email, and SMS triggers

## Philosophy

Platform configuration lives in YAML. Business logic lives in TypeScript services.

```yaml
services:
  - name: OrdersService

https:
  - name: api
    port: 3000
    services:
      - OrdersService
```

```ts
@Register()
class OrdersService extends Service {
  routes(): Route {
    const route = super.routes();

    route.http().get('/orders').do(async () => {
      return [{ id: 'order-1' }];
    });

    return route;
  }
}
```

## Start here

- [Getting started](./getting-started.md)
- [Configuration overview](./configuration/overview.md)
- [Service-to-service calls](./guides/service-to-service-calls.md)
- [Distributed platform guide](./guides/distributed-platform.md)
- [Idempotency and ownership](./concepts/idempotency.md)

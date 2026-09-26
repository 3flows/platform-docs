# Platform runtime

A platform instance starts configured services and infrastructure from YAML.

Common top-level sections are:

```yaml
services: []
https: []
graphqls: []
mqs: []
timers: []
registries: []
discovery: {}
coordinators: []
idempotencies: []
remotes: {}
runtime: {}
```

## Business services vs infrastructure

Business logic is configured under `services`.

```yaml
services:
  - name: OrdersService
```

Infrastructure is configured under its own first-class section.

```yaml
mqs:
  - name: DEFAULT
    type: memory

coordinators:
  - name: DEFAULT
    type: memory
```

Registries, coordinators, and idempotency stores are platform infrastructure, not normal business services.

## Runtime metadata

The `runtime` section is metadata. It describes the running platform instance and deployment role. It is not treated as a service section.

```yaml
runtime:
  id: orders-worker-1
  group: orders
  environment: local
```

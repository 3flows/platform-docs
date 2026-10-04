# Platform runtime

A platform runtime starts the services and infrastructure described in YAML, owns them while they run, and stops them.

## Running a platform

For an application, use the static facade:

```ts
import { Platform } from '@3flows/platform';
import './services.js'; // every class used in YAML, imported before the platform starts

await Platform.run('./platform.yml');
// …
await Platform.shutdown();
```

For tests, embedded use or several applications in one process, create explicit runtimes. Each owns its own services, providers, service clients and generated APIs:

```ts
const runtime = Platform.create();
await runtime.run('./platform.yml');

runtime.has('AppointmentsService'); // true
Platform.create().has('AppointmentsService'); // false: another runtime, nothing loaded

await runtime.shutdown();
```

Configuration can be reloaded, manually or by watching the file:

```ts
await Platform.reload();
await Platform.run('./platform.yml', { watch: true });
```

A reload restarts the configured services. If the new configuration fails, the previous one keeps running. With `$vault` references, a reload resolves them again, even if the YAML didn't change. See [`vaults`](../configuration/vaults.md).

## Business services vs infrastructure

Business logic is configured under `services`:

```yaml
services:
  - name: AppointmentsService
```

Infrastructure is configured under its own first-class sections: `docs`, `kvs`, `mqs`, `sqls`, `vaults`, `connectors`, `coordinators`, `idempotencies` and so on.

```yaml
mqs:
  - name: DEFAULT
    type: memory
```

Handlers reach infrastructure through `trigger.context` (`doc()`, `kv()`, `mq()`, `sql()`, `vault()`, `connector()`, `service()`), which resolves it through the runtime that owns the service.

## Inspecting a running platform

`Platform.inspect()` (or `runtime.inspect()`) returns the **runtime manifest**, a typed description of what's running:

```ts
const manifest = Platform.inspect();

manifest.instance;      // id, name, application version, start time, labels
manifest.configuration; // source file, hash of the loaded configuration, sections
manifest.services;      // every service: status, dependencies, handlers with input and output JSON Schemas
manifest.providers;     // every infrastructure provider, e.g. doc::memory::default
manifest.connectors;    // connectors with inbound endpoint, policies, events and health
manifest.domains;       // domains with entities, fields and relationships
```

Use it in tests to check what's running, and in tools and agents to understand an application without reading its source. Over HTTP, the [admin API](../configuration/admins.md) describes the same platform.

## Runtime and instance metadata

`runtime` and `instance` are metadata, not services.

```yaml
runtime:
  id: ${{ HOSTNAME }}    # identifies this process, e.g. in registry registrations
  identity:              # who this process is when it calls other processes
    provider: workloads
    workload: platform://workloads/appointments

instance:
  labels:
    team: reception
    environment: production
```

`instance.id`, `instance.name` and `instance.labels` appear in the manifest. See [`identities`](../configuration/identities.md) for `runtime.identity`.

## Modules

Packages that register providers, such as connector packages, can be loaded from YAML instead of being imported in code:

```yaml
modules:
  - '@3flows/platform-connector-slack'
```

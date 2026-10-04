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
| `docs`, `kvs`, `blobs`, `vectors` | Documents, key-value stores, files and vector search |
| `entities` | Where entities and the entities of `domains` are stored |
| `graphqls` | GraphQL endpoints |
| `ontologies` | Domains published as ontologies for people, catalogs and agents |
| `mcps` | MCP servers for agents: chosen handlers as tools, ontologies as resources |
| `sqls` | Relational databases, used by services and pipelines |
| `smss`, `emails` | SMS and email providers |
| `vaults` | Secret stores. Resolve `$vault` references before anything else starts |
| `connectors` | External applications, such as Slack: operations, inbound events, retries and dead letters |
| `identities`, `idps` | Signing workload tokens, and verifying user and workload tokens |
| `admins` | The admin (control-plane) API |
| `pipelines` | Data pipelines to start |
| `flows` | Flows to start, and where their runs are kept |
| `mqs` | Message queues and topics |
| `timers` | Cron-like timer triggers |
| `registries` | Service registration and lookup |
| `discovery` | Automatic registration/resolution through registries |
| `coordinators` | Distributed leases and ownership |
| `idempotencies` | Duplicate suppression for async triggers |
| `remotes` | Static remote service endpoints |
| `runtime` | Runtime metadata: `id`, `identity`, configuration refresh |
| `instance` | Instance metadata for the manifest: `id`, `name`, `labels` |
| `modules` | Packages to import before startup, e.g. connector packages |
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

## Variables and secrets

Two kinds of values are filled in when the configuration is loaded:

| Syntax | Resolved from | Use it for |
|---|---|---|
| `${{ NAME }}` | The process environment, or the `env` section | Settings that differ per environment but aren't secret: host names, IDs, feature flags |
| `{ $vault: { path, key } }` | A vault in the `vaults` section | Passwords, tokens, API keys, connection strings |

```yaml
runtime:
  id: ${{ HOSTNAME }}

vaults:
  - name: DEFAULT
    type: hashicorp
    parameters:
      address: https://vault.internal:8200
      auth: { method: jwt, role: orders, jwt: ${{ VAULT_JWT }} }

sqls:
  - name: orders
    type: postgres
    parameters:
      connectionString:
        $vault: { path: orders-database, key: connectionString }
```

`$vault` references are resolved after the vaults start and before any other service does. Resolved values are redacted wherever the platform shows its configuration. See [`vaults`](./vaults.md).

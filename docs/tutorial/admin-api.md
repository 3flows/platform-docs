---
title: 22. Look inside
---

# 22. Look inside

**Where we are:** the complete app, with health checks, metrics and an OpenAPI description.

**What we want:** `/ping` says the app is healthy, but a running system is more than a status. *Which services are up? Did the pipelines, the flow and the connector start? What configuration is active? How are entities mapped to storage, and what are their keys?* Operators, consoles, tests and agents all need to look inside a running platform.

## The obvious way

Read `platform.yml`. Everything is declared there, isn't it?

## Where it breaks

The YAML is what you *asked for*, not what's *running*:

- `${{ MONGO_URL }}` and, from the [next chapter](./vaults.md), `$vault` references are resolved at startup. The file doesn't say what they resolved to, or whether they did.
- Defaults aren't in the file. Neither are the platform's own services: the YAML lists four services, but 36 are running.
- Which version of the app is deployed? Which handlers does it have, with which contracts? Which domains, which connectors, and are they healthy? The YAML doesn't know; the code and the process do.
- After a reload, or in a pod three deployments later, nobody is sure the file in the repository is the file that was loaded.

## The concept: the platform describes itself

Two ways in, describing the same running platform.

### Over HTTP: the admin API

YAML only:

```yaml title="platform.yml"
# Read-only control-plane API. Disabled unless explicitly enabled.
# In production, protect it with `auth` or expose it on an internal HTTP server only.
admins:
  - name: admin
    useHttp: api
    path: /admin
    enabled: true
    readonly: true
```

| Endpoint | Describes |
|---|---|
| `GET /admin/api/summary` | Running state, counts of services, entities, domains, ontologies and GraphQL endpoints |
| `GET /admin/api/platform` | The platform instance and every service with its status and dependencies |
| `GET /admin/api/configuration` | The resolved configuration, with secrets redacted |
| `GET /admin/api/services` | Every service with its status |
| `GET /admin/api/entities` | Entities with fields, key, backend, database and collection |
| `GET /admin/api/domains` | Domains with entities, keys and relationships |
| `GET /admin/api/ontologies` | Ontology projections and where they're served |
| `GET /admin/api/graphqls` | GraphQL endpoints and what they expose |
| `POST /admin/api/reload` | Reloads the configuration. Only with `readonly: false` and `allowReload: true` |

### In code: `Platform.inspect()`

`Platform.inspect()` returns the **runtime manifest**: a typed description of the running platform, for tests, tools and agents.

```ts
const manifest = Platform.inspect();
```

| Part | Contains |
|---|---|
| `runtime` | Running, generation (reloads), number of services |
| `instance` | ID, name, application version, start time, labels |
| `configuration` | Name, source file, a hash of the loaded configuration, its sections |
| `services` | Every service with status, dependencies and its **handlers with input and output schemas** |
| `providers` | Every infrastructure provider: `doc::memory::default`, `sms::memory::default`, … |
| `connectors` | Every connector with its inbound endpoint, queue, retry and dead-letter policy, events and health |
| `domains` | Domains with their entities, fields and relationships |

## Run it

```sh
yarn step:22
curl localhost:3000/admin/api/summary
```

```json
{
  "running": true,
  "readonly": true,
  "reloadEnabled": false,
  "services": { "total": 36, "ready": 36, "failed": 0 },
  "entities": { "total": 2 },
  "domains": { "total": 1 },
  "ontologies": { "total": 1 },
  "graphqls": { "total": 1 }
}
```

36 services: your four services, four pipelines, the flow and the Slack connector, plus the platform's own services for `docs`, `kv`, `sqls`, `mqs`, timers, GraphQL, MCP and so on.

```sh
curl localhost:3000/admin/api/entities
```

```json
[
  {
    "name": "Appointment",
    "backend": "docs",
    "db": "appointments",
    "collection": "Appointments",
    "key": ["customer", "at"],
    "fields": [
      { "name": "_id", "type": "string", "required": false },
      { "name": "at", "type": "string", "required": true },
      { "name": "customer", "type": "object", "required": true, "reference": { "entity": "Customer", "cardinality": "one" } },
      …
    ]
  },
  …
]
```

The manifest is how the sample's test checks what's running, without HTTP:

```ts title="step.test.ts"
const manifest = Platform.inspect();

const appointments = manifest.services.find((service) => service.serviceName === 'AppointmentsService');
const book = appointments?.handlers.find((handler) => handler.name === 'bookAppointment');
assert.deepEqual((book?.inputSchema as any).required, ['name', 'phone', 'at']);

assert.ok(manifest.providers.some((provider) => provider.id === 'sms::memory::default'));
assert.equal(manifest.connectors[0].name, 'reception');
assert.deepEqual(manifest.domains[0].entities.map((entity) => entity.name), ['Customer', 'Appointment']);
```

The handler contracts from [chapter 1](./book-an-appointment.md) show up here as JSON Schema: the same contracts that validate requests, describe the API and define the MCP tools.

## Safe by default

- The admin API is **disabled** unless `enabled: true`.
- It's **read-only** by default. Reload must be enabled explicitly.
- Secrets are redacted: keys like `password`, `token` or `connectionString` show `[REDACTED]`. The [next chapter](./vaults.md) takes them out of the configuration altogether.
- It's a JSON API. Consoles and tools build on top of it.

## What you learned

- **A running platform describes itself:** services with their contracts, providers, connectors, configuration and model.
- That description comes from the same primitives, contracts and domain you wrote, so it's useful for humans, tests and agents alike.

## Reviewer's view

> No code changes. A read-only admin API at `/admin/api`.

Check that it's protected or internal before it goes to production.

[Sample: step 22](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/22-admin) · Next: [Keep secrets in a vault](./vaults.md)

---
title: What's new in 0.9
sidebar_label: What's new in 0.9
---

# What's new in Platform 0.9

Platform 0.9 is the release where the runtime becomes inspectable, more isolated, and safer to operate. It keeps the simple service/handler programming model, but adds stronger contracts, richer agent surfaces, connector reliability and production-grade orchestration primitives.

## Highlights

### Runtime instances and a control-plane manifest

0.9 introduces `Platform.create()` and a `PlatformRuntime` behind the static `Platform` facade. Services now have an owning runtime, and runtime inspection is first-class:

```ts
const platform = Platform.create();
await platform.run('./platform.yml');
const manifest = platform.inspect();

manifest.instance.applicationVersion;
manifest.instance.platformVersion;
manifest.services;      // services and handler contracts
manifest.providers;     // docs, kvs, mqs, sqls, vaults, ...
manifest.connectors;    // connector endpoints, policy and health
manifest.timers;        // timer state and last failures
```

The same manifest is available through `Platform.inspect()`, `Platform.control().manifest()` and the admin API when configured. It is what tests, consoles and agents should read instead of reconstructing runtime state from YAML.

### Enforced handler contracts

Handler input schemas are now parsed before the handler runs, and output schemas are enforced through `trigger.ok(...)`.

- Invalid input becomes structured HTTP `400` / JSON-RPC `INVALID_INPUT`.
- Invalid output becomes a structured platform error and is not sent to callers.
- The same contracts drive OpenAPI, JSON-RPC schema, GraphQL, MCP tools and the manifest.

See [Services and routes](../concepts/services-and-routes.md).

### Domains, entities, GraphQL, ontology and MCP work together

The platform can now project the same domain model into multiple surfaces:

- typed domain-created entities and natural keys,
- generated GraphQL schemas for domains and service handlers,
- ontology cards/resources with descriptions, aliases, fields and relationships,
- MCP tools and resources for assistants.

MCP exposure also understands handler metadata. If a service has metadata-marked tools and `mcps[].services[].handlers` is omitted, only those marked tools are exposed by default; services without tool metadata keep the previous expose-all behavior.

### Connector runtime

Connectors are now a Platform core concept. A connector provider registers a type, declares operations as handlers and normalizes inbound events. The runtime owns:

- HTTP intake at `POST /connectors/<name>/events`,
- signature/challenge/parse handoff to the provider,
- event idempotency through `idempotencies`,
- queue delivery to `route.connector(name).event(type)`,
- retry and dead-letter policy,
- health counters in `Platform.inspect().connectors`.

A security-important change: `connectors[].useHttp` mounts only inbound event intake. Connector operations are ordinary service handlers and must be exposed explicitly through `https[].services` if you want them reachable over HTTP.

See [Connectors](../concepts/connectors.md) and [`connectors`](../configuration/connectors.md).

### Reliable async delivery

MQ, connector, webhook, email/SMS and timer-style triggers no longer silently swallow async failures.

- MQ routes can configure route-level retry and dead-letter queues under `mqs[].routes`.
- Connector events can configure idempotency, retry and DLQ policy under `connectors[].events`.
- Timer failures are awaited, logged, counted and reported in the manifest without terminating the process.
- Singleton timer ownership is shared across YAML timers, pipeline timers and flow timers.

### Flows become runtime orchestration

Flows now support richer orchestration:

- lifecycle events via `Flow.run(input, { onEvent })` and `FlowRuntime.run(...)`,
- optional strict event-delivery mode,
- `AbortSignal` cancellation and `FlowCancelledError` reporting,
- persisted variables across waits and resumes,
- step-level skip predicates,
- recovery/fallback handlers,
- condition `otherwise` branches,
- branch/skipped-step reporting and a materialized `DefinedFlow` wrapper.

See [`pipelines` and `flows`](../configuration/pipelines-and-flows.md).

### New and hardened provider families

0.9 expands the provider surface substantially:

- SQL: memory, SQLite, Postgres and MariaDB with a fluent API.
- Docs: Postgres backend in addition to memory/Mongo-style providers.
- KVS: Memcached backend in addition to memory/Redis-style providers.
- Vectors: Redis backend and hardened memory/Mongo behavior.
- Vaults: memory, HashiCorp Vault, Azure Key Vault and macOS Keychain support.
- Coordinators: memory, HTTP coordinator and native Azure Blob lease coordination.

### Security posture improvements

- Open MCP and ontology surfaces now warn on startup; with `triggering.strict: true`, startup fails unless they are authenticated.
- `identifies: api` is rejected because API-token principals are not implemented yet. Use `service` or `user`.
- The hard-coded `https[].security.sessionSecret` default was removed.
- WebSocket routes now honor HTTP/service auth configuration and propagate identity into triggers.

## Learn it through the sample

The appointment reminders tutorial covers the 0.9 shape end-to-end: handlers, docs, SMS, timers, KVS, MQ, services, entities, domains, GraphQL, ontology, MCP, transformers, pipelines, SQL sync, dead letters, lineage, flows, Slack connectors, the admin API, vaults, split processes, discovery and workload identity.

Start with the [tutorial overview](../tutorial/index.md), or use the [0.8 to 0.9 migration guide](./migration-0.8-to-0.9.md) when upgrading an existing app.

---
title: Migrate from 0.8 to 0.9
sidebar_label: Migrate 0.8 → 0.9
---

# Migrate from Platform 0.8 to 0.9

This guide focuses on app-level changes you should review when moving an existing Platform 0.8 application to 0.9.

## 1. Upgrade and run the manifest/tests first

Upgrade the package and run your existing tests:

```sh
yarn up @3flows/platform@^0.9.0
# or, while the prerelease line is used:
yarn up @3flows/platform@next
yarn test
```

Then start the app and inspect the runtime:

```ts
const manifest = Platform.inspect();
console.log(manifest.instance.applicationVersion, manifest.instance.platformVersion);
console.log(manifest.services.map((service) => service.serviceName));
```

The manifest is the quickest way to see what 0.9 actually started: services, handler contracts, providers, connector health, timer state, domains and exposed agent surfaces.

## 2. Replace direct static service-registry access

0.9 introduces runtime instances through `Platform.create()` and removes public direct access to the mutable static service registry.

Prefer runtime-owned access inside services and handlers:

```ts
// Good inside a service
const notifications = this.platform().get('NotificationsService');

// Good inside a handler/route
const notifications = trigger.context.service('NotificationsService');
```

For inspection-style code, use registry accessors instead of `Platform.services`:

```ts
Platform.listServices();
Platform.serviceEntries();
Platform.serviceValues();
Platform.serviceIds();
Platform.serviceCount();
```

The static `Platform` API remains a compatibility facade, but new runtime-sensitive code should use the owning runtime (`this.platform()`, `trigger.context`, or a `PlatformRuntime` returned by `Platform.create()`).

## 3. Check handler contracts

0.9 enforces both sides of every handler contract.

- The handler receives parsed input, not raw unvalidated JSON.
- Invalid input returns HTTP `400` / JSON-RPC `INVALID_INPUT`.
- `trigger.ok(...)` validates the output schema.
- Invalid output is treated as a platform error and is not returned to the caller.

Migration checklist:

1. Make each handler input schema match what clients really send.
2. Make each output schema match exactly what `trigger.ok(...)` returns.
3. If a handler previously returned data directly, update it to call `trigger.ok(...)`.
4. Update tests that expected a generic `500` or custom validation shape for bad input.

## 4. Expose connector operations explicitly

This is the most important connector behavior change.

In 0.8-style connector setups, `connectors[].useHttp` exposed more than inbound events. In 0.9 it mounts only the inbound connector intake route:

```yaml
connectors:
  - name: reception
    type: slack
    useHttp: slack
```

That gives the provider this endpoint only:

```txt
POST /connectors/reception/events
```

Connector operations (`messages.send`, `outbox`, `inject`, and so on) are ordinary service handlers. If you need them over HTTP, expose the connector service explicitly:

```yaml
https:
  - name: slack-dev
    port: 3002
    services:
      - name: reception
        basepath: /

connectors:
  - name: reception
    type: slack-memory
    useHttp: slack-dev
```

For production, usually expose only the intake path to the external provider. Call connector operations from application code through the connector helper or service client instead of opening them publicly.

## 5. Configure async retry and dead letters intentionally

Non-response trigger failures now propagate to the delivery system instead of disappearing.

For MQ routes, add route-level policy when a failure should retry or land in a DLQ:

```yaml
mqs:
  - name: DEFAULT
    type: memory
    use:
      - NotificationsService
    routes:
      reminders:
        retry:
          attempts: 3
          backoffMs: 1000
        dlq:
          queue: reminders.failed
```

For connector events, configure policy under the connector:

```yaml
connectors:
  - name: reception
    type: slack
    useHttp: slack
    events:
      idempotency:
        ttlSeconds: 86400
      retry:
        attempts: 3
        backoffMs: 1000
      dlq:
        queue: reception.failed
```

If a 0.8 route relied on failures being logged and ignored, add an explicit route error handler or DLQ policy.

## 6. Review timers and ownership

Timer handlers are awaited now. Failed runs are logged, counted and shown in `Platform.inspect().timers` rather than becoming unhandled process-level failures.

If you run more than one instance, review timer ownership:

```yaml
coordinators:
  - name: DEFAULT
    type: memory # use a distributed coordinator in real multi-process deployments

timers:
  - service: AppointmentsService
    name: reminders
    cron: '0 * * * * *'
    ownership:
      mode: singleton
      coordinator: DEFAULT
      ttlMs: 10000
```

When a `DEFAULT` coordinator exists, timers without explicit ownership default to singleton behavior. Without a coordinator, they run locally in every instance and warn unless strict triggering is enabled.

## 7. Add auth to MCP and ontology surfaces

Open MCP and ontology surfaces now warn at startup. If `triggering.strict: true` is enabled, open surfaces fail startup.

Add auth where these surfaces are reachable outside trusted development environments:

```yaml
mcps:
  - name: assistant
    useHttp: api
    path: /mcp
    auth:
      idp: DEFAULT
      identifies: user
      audience: [assistant]
```

Use `identifies: user` for people and `identifies: service` for workload-to-workload calls. `identifies: api` is rejected in 0.9 because API-token principals are not implemented yet.

## 8. Review HTTP, WebSocket and version assumptions

- HTTP service basepaths are matched strictly; routes should not depend on paths outside their configured `basepath`.
- WebSocket routes now follow HTTP/service auth behavior and receive identity context.
- The manifest splits versions: `applicationVersion` is your app package version and `platformVersion` is the `@3flows/platform` package version.
- `/ping`, OpenAPI and the optional `version` endpoint continue to report the application version when one is available.

## 9. Review data parsing edge cases

0.9 fixes several parser/compiler edge cases that may change tests that encoded old bugs:

- `CSVTransformer` with explicit `headerNames` now applies them to every row. To skip and rename an existing header row, set both `headerNames` and `useFirstRowAsHeader: true`.
- CSV/record-CSV/SAX splitting defaults to LF instead of the host OS line ending.
- SQL `notIn([])`, `$notIn` and `$nin` semantics are now consistent across memory, SQLite, Postgres and MariaDB.
- JSON-RPC empty handler results serialize as `result: null`.
- GraphQL input/output enum names are separated so matching enum fields do not collide.

## 10. Optional: adopt the new 0.9 capabilities

After the app is running, consider adopting the new 0.9 features deliberately:

- replace static `Platform.start()` tests with isolated `Platform.create()` runtimes where useful,
- expose a read-only admin API for operations,
- use connector idempotency/retry/DLQ instead of ad-hoc event handling,
- move long-running business processes into flows,
- publish domains through GraphQL, ontology and MCP,
- use workload identity for service-to-service calls,
- add vault-backed configuration for credentials.

For a tour of the features, see [What's new in 0.9](./whats-new-0.9.md).

# `connectors`

The `connectors` section configures [connectors](../concepts/connectors.md) to external applications. Each entry is one provider account, for example one Slack workspace.

```yaml
connectors:
  - name: reception
    type: slack
    useHttp: slack
    parameters:
      botToken:
        $vault: { path: slack-reception, key: botToken }
      signingSecret:
        $vault: { path: slack-reception, key: signingSecret }
    events:
      queue: reception.events
      idempotency:
        ttlSeconds: 86400
      retry:
        attempts: 3
        backoffMs: 1000
      dlq:
        queue: reception.failed
```

The provider's package must be loaded, by importing it in code or with `modules`:

```yaml
modules:
  - '@3flows/platform-connector-slack'
```

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | Connector name, used by `connector(name)`, `service(name)`, `route.connector(name)` and the manifest |
| `type` | | Provider type, e.g. `slack` or `slack-memory`. Required. An unregistered type fails at startup |
| `parameters` | `{}` | Provider settings and credentials. Use `$vault` references for credentials |
| `useHttp` | | `https` server for inbound events. Without it, the connector receives no events over HTTP |
| `path` | `/connectors/<name>/events` | Path of the inbound endpoint |
| `events.queue` | `connectors.<name>.events` | Queue that inbound events are delivered through |
| `events.idempotency.store` | `DEFAULT` | `idempotencies` store for duplicate events. Without an `idempotencies` section, duplicates aren't dropped by the intake |
| `events.idempotency.ttlSeconds` / `ttlMs` | one day | How long an event ID is remembered |
| `events.retry.attempts` | `1` | Attempts per route when it throws |
| `events.retry.backoffMs` | `0` | Wait between attempts |
| `events.dlq.queue` | | Queue for events that failed every attempt. Without it, the error is thrown to the queue |

Services with `route.connector(...)` routes need an `mqs[].use` entry, because events are delivered through `mqs`.

## Dead-letter messages

```json
{
  "connector": "reception",
  "type": "reaction.added",
  "event": { "id": "Ev02", "type": "reaction.added", "payload": { … }, … },
  "attempts": 3,
  "failedAt": "2026-10-04T20:57:51.000Z",
  "error": { "name": "Error", "message": "No waiting flow for referrals.reviewed:…" }
}
```

## Slack

`@3flows/platform-connector-slack` registers:

| Type | Use it for |
|---|---|
| `slack` | A real workspace: Web API, Events API with signature verification, Socket Mode |
| `slack-memory` | Development and tests: an `outbox` operation and an `inject` operation, same schemas |

| Parameter | Description |
|---|---|
| `botToken` | Bot token (`xoxb-…`) |
| `signingSecret` | Signs the Events API requests |
| `appToken`, `socketMode` | Socket Mode instead of an HTTP endpoint |
| `workspaceId`, `apiUrl` | Optional |

Operations: `messages.send`, `reactions.add`, `reactions.remove`, `files.upload`, `files.download`. Events: `message.created`, `app.mentioned`, `reaction.added`, `reaction.removed`, `file.shared`, `file.created`.

## Known limitations

:::caution
`useHttp` mounts **all** of the connector's routes on that server: its JSON-RPC endpoint and every operation (e.g. `/messages.send`, and `/inject` for memory types), without `auth`, not only the events path. Give the connector an `https` server of its own, and expose only `/connectors/<name>/events` to the provider. A connector on a server that also has a service at its root fails at startup with `POST /.jsonrpc … already in use`.
:::

See the tutorial chapter [Reception works in Slack](../tutorial/slack.md) for a runnable example.

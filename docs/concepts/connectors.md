# Connectors

A connector connects the platform to an external business application: Slack, and later CRMs, ticket systems and ERPs. Application code never talks to the provider's API or SDK directly, and never handles its credentials.

## The model

| | |
|---|---|
| **A connector is a service** | Its name is the connector's `name` in YAML. It runs in the platform like any service and shows up in the manifest |
| **Operations are handlers** | `messages.send`, `reactions.add`, … with input and output contracts. Called through the provider's helper, `trigger.context.connector(name).call(method, input)` or `service(name)`, also from other processes |
| **Events are routes** | `route.connector(name).event(type).do(fn)`. Events arrive through a queue, so a slow route never delays the provider |
| **Providers are packages** | `@3flows/platform-connector-slack` registers `slack` and `slack-memory`. A connector type that isn't registered fails at startup |
| **Every provider has a memory type** | Same operations, events and schemas, with an outbox to read and an `inject` operation to play the provider |

```ts
import { slack } from '@3flows/platform-connector-slack';

// an operation
await slack(trigger.context).connector('reception').channel('C0RECEPTION').message('Hello').send();

// an event
route.connector('reception').event('reaction.added').do(async (event, trigger) => {
    const { payload } = event as ConnectorEvent<Reaction>;
});
```

## Inbound events

The platform runs the intake at `POST /connectors/<name>/events` on the `https` server named in `useHttp`:

1. Keep the raw body, which providers sign.
2. **Verify** the provider's signature. Invalid requests get `401`.
3. Answer provider **handshakes**, such as Slack's `url_verification`.
4. **Parse** the request into event envelopes.
5. **Drop duplicates**: each event ID is claimed in the `idempotencies` store.
6. **Enqueue** each envelope on the connector's queue.
7. **Acknowledge** with `200`, within the provider's deadline.

Routes then receive the events from the queue. When a route throws, the platform **retries** it (`events.retry`) and finally sends the event to a **dead-letter queue** (`events.dlq`) with the error, instead of losing it or retrying forever.

## The event envelope

```ts
type ConnectorEvent<T = unknown> = {
    id: string;          // the provider's event ID; the duplicate key
    provider: string;    // 'slack'
    connector: string;   // 'reception'
    type: string;        // 'reaction.added'
    account?: string;    // e.g. the Slack workspace
    occurredAt?: string;
    receivedAt: string;
    subject?: { externalType?: string; externalId?: string };
    actor?: { externalId?: string; displayName?: string };
    payload: T;          // provider-specific
};
```

The envelope stays technical. Interpreting an event, *"reception approved this batch"*, is the application's job.

## Health

`Platform.inspect().connectors` reports every connector with its inbound endpoint, queue, idempotency, retry and dead-letter policies, its events with payload schemas, and its health: configured, authenticated, connected, events received, delivered, dropped as duplicates and failed, and the last error.

## Writing a provider

A provider extends `Connector`, registers itself with `@Register('<type>', 'connector')`, declares `handlers` and `events`, and implements `verify`, `challenge` and `parse` for its inbound requests. Provider packages declare `@3flows/platform` as a **peer dependency**, so they register into the application's platform and not into a copy of their own.

Walk through it hands-on in the tutorial: [Reception works in Slack](../tutorial/slack.md). Configuration: [`connectors`](../configuration/connectors.md).

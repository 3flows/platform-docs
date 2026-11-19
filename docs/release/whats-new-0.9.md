---
title: What's new in 0.9
sidebar_label: What's new in 0.9
---

# What's new in 0.9

0.8 was a toolbox: services and routes, and one primitive per piece of infrastructure. An application built with it worked, but everything above the infrastructure was still yours to write: validation, the model, imports, processes that wait, webhooks, secrets, calls between processes.

0.9 moves those into the platform, too. The [tutorial](../tutorial/index.md) is the best way to see it: it builds one application in 27 small steps, and 17 of them are built on something that didn't exist in 0.8. This page follows the same path.

Upgrading an application? The [migration guide](./migration-0.8-to-0.9.md) lists what you have to change.

## The short version

| | 0.8 | 0.9 |
|---|---|---|
| Handler schemas | Input checked, output ignored | **Contracts**: both enforced, the handler gets the parsed input |
| A route that throws | Logged and forgotten | Fails the delivery: retry, redelivery, dead letters |
| SMS, email, webhooks | One `mbs` section with transports | `smss`, `emails` and `webhooks`, each with a `memory` type for tests |
| The model | Entities, one by one | A **domain**: typed entities, relationships, natural keys, meaning |
| APIs for the model | Hand-written GraphQL resolvers | GraphQL, an ontology and MCP tools, **generated** from the domain and the handlers |
| Data from other systems | Transformers | **Pipelines** with sources, sinks, dead letters and lineage. `sqls` |
| Processes that wait | A status field | **Flows** |
| External applications | An HTTP route per webhook | **Connectors** |
| Secrets | Environment variables | **Vaults** and `$vault` references |
| What's running | Read the YAML | `Platform.inspect()` and the admin API |
| More than one process | HTTP clients | `service(name)`, `remotes`, discovery, workload identity |
| More than one instance | Every timer runs everywhere | Coordinators and singleton timers, idempotency |

## Six things to try first

### 1. Contracts are enforced

In 0.8, a handler's input schema was checked and then ignored: the handler got the raw request, and nothing looked at what it answered. In 0.9, both schemas are a contract.

```ts
handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
    // input is the parsed BookAppointment: typed, defaults filled in, unknown fields gone
    await trigger.ok({ id: randomUUID(), ...input }); // checked against Appointment
});
```

```sh
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' -d '{"name":"Ada","at":"tomorrow"}'
# 400 { "title": "INVALID_INPUT", "detail": "Invalid input for handler bookAppointment", … }
```

An answer that doesn't match the output schema is never sent: the caller gets `500 INVALID_OUTPUT`. The same two schemas now describe the handler in OpenAPI, JSON-RPC, GraphQL, MCP and the runtime manifest.

See it in [chapter 1](../tutorial/book-an-appointment.md).

### 2. One domain, described once

A domain holds the entities, their relationships, their keys and what they mean:

```ts
export const Scheduling = domain('Scheduling', (d) => {
    const Customer = d
        .entity('Customer', { name: d.string(), phone: d.string().describe('E.164, without spaces') }, { key: ['phone'] })
        .describe('A person who books appointments. One customer per mobile number.')
        .alias('patient');
    const Appointment = d.entity(
        'Appointment',
        { at: d.string(), customer: d.one(Customer).inverse('appointments') },
        { key: ['customer', 'at'] }
    );
    return { Customer, Appointment };
});
```

Everything else is YAML:

| Section | What you get from the domain |
|---|---|
| `entities` | Storage. With a **natural key**, creating "the same" customer twice updates the first one |
| `graphqls` | Queries, mutations and relationships in both directions |
| `ontologies` | The concepts and their meaning as JSON, JSON-LD and Turtle, with search, for people, catalogs and agents |
| `mcps` | An MCP server: the handlers you list as tools, the ontology as resources |

See it in chapters [9](../tutorial/domain.md) to [13](../tutorial/mcp.md).

### 3. Pipelines and flows

A pipeline moves data from a source to a sink and reads from top to bottom:

```ts
return this.pipeline('crm-customers')
    .on.mq().queue('crm-customers')
    .from.trigger().payload()
    .toEntity(Customers, { name: (customer) => customer.fullName })
    .onError('entity').deadLetter()
    .deadLetters().to.doc().db('datahub').collection('dead_letters')
    .lineage().to.doc().db('datahub').collection('lineage');
```

A flow is a process with steps, some of which wait, for days if they have to:

```ts
return this.flow('referrals')
    .on.http().post('/referrals')
    .from.trigger().payload()
    .step('notify-reception').call('NotificationsService').method('referralsReceived').input((ctx) => ({ … }))
        .retry({ attempts: 3, backoffMs: 1000 })
    .waitFor('review').event('referrals.reviewed').correlate((ctx) => ctx.runId).timeout('3d')
    .when('accepted', (ctx) => ctx.event.accepted)
        .step('import').pipeline('referral-import').input((ctx) => ctx.input.referrals)
    .end();
```

Both are services: they're started from YAML, exposed through `https` and `mqs`, and report every run. See them in chapters [15](../tutorial/pipelines.md) to [19](../tutorial/flows.md).

### 4. Failures don't disappear

In 0.8, a queue route that threw was logged, and the message was gone. In 0.9, the error reaches whatever delivered the message, and YAML says what happens next:

```yaml
mqs:
  - name: DEFAULT
    type: rabbitmq
    use:
      - NotificationsService
    routes:
      confirmations:
        retry: { attempts: 3, backoffMs: 1000 }
        dlq: { queue: confirmations.failed }
```

The same goes for timers, which now report their last run, last error and failure count, and for connector events. See it in [chapter 6](../tutorial/dont-block-booking.md).

### 5. Connectors

Slack, a CRM, a ticket system: an external application is a connector. Its operations are handlers, and its events are routes. The platform does the part every webhook needs, and that's easy to get wrong: checking the signature, answering in time, dropping duplicates, retrying, keeping what failed.

```ts
route.connector('reception').event('reaction.added').do(async (event, trigger) => { /* … */ });
```

A provider's `memory` type, such as `slack-memory`, makes all of it testable without an account. See it in [chapter 20](../tutorial/slack.md).

### 6. A platform that describes itself

```ts
const manifest = Platform.inspect();

manifest.instance;   // name, applicationVersion, platformVersion, start time, labels
manifest.services;   // every service, with its handlers and their contracts as JSON Schema
manifest.providers;  // doc::memory::default, sms::twilio::default, …
manifest.connectors; // endpoints, policies and health
manifest.timers;     // schedule, last run, last error, failures
manifest.domains;    // entities, fields, keys, relationships
```

Tests assert on it, the admin API serves it, and an agent can read it instead of your source code. See it in [chapter 22](../tutorial/admin-api.md).

## The tour, chapter by chapter

Every chapter of the tutorial has a tested [sample step](https://github.com/3flows/platform-samples/tree/main/appointment-reminders). This is what 0.9 changed for each of them.

### Part 1: Build it

| Chapter | In 0.9 |
|---|---|
| [0. Hello World](../tutorial/hello-world.md) | As in 0.8. `/ping` and OpenAPI now report the `version` of your `package.json` |
| [1. Book an appointment](../tutorial/book-an-appointment.md) | **Changed.** Contracts are enforced: parsed input, checked output, `INVALID_INPUT` and `INVALID_OUTPUT` |
| [2. Store appointments](../tutorial/store-appointments.md) | As in 0.8. New `postgres` type for `docs` |
| [3. Confirm by SMS](../tutorial/confirm-by-sms.md) | **Changed.** `sms()` and the `smss` section replace `mb()` and `mbs`. **New:** a `memory` type, so tests need no Twilio account |
| [4. Send reminders](../tutorial/send-reminders.md) | As in 0.8. A failing timer run is logged, counted and shown in the manifest |
| [5. Remind only once](../tutorial/remind-only-once.md) | As in 0.8. New `memcached` type for `kvs` |
| [6. Don't block booking](../tutorial/dont-block-booking.md) | **Changed.** A queue route that throws fails the delivery. **New:** `retry` and `dlq` per queue |
| [7. A notifications service](../tutorial/notifications-service.md) | **New.** `service(name).method(…).input(…).call()` |

### Part 2: Model it and open it up

| Chapter | In 0.9 |
|---|---|
| [8. Entities](../tutorial/entities.md) | As in 0.8 |
| [9. One domain](../tutorial/domain.md) | **New.** `domain(…)` with typed entities and relationships |
| [10. GraphQL](../tutorial/graphql.md) | **New.** GraphQL generated from domains, entities and handlers. Your own resolvers still work |
| [11. Natural keys](../tutorial/natural-keys.md) | **New** |
| [12. Ontology](../tutorial/ontology.md) | **New.** `ontologies` |
| [13. An assistant through MCP](../tutorial/mcp.md) | **New.** `mcps` |

### Part 3: Become a data hub

| Chapter | In 0.9 |
|---|---|
| [14. Transformers](../tutorial/transformers.md) | As in 0.8, plus transformers that read and write entities |
| [15. Pipelines](../tutorial/pipelines.md) | **New** |
| [16. Sync from a database](../tutorial/sync-from-a-database.md) | **New.** `sqls` with `memory`, `sqlite`, `postgres` and `mariadb` |
| [17. Dead letters](../tutorial/dead-letters.md) | **New** |
| [18. Medallion layers and lineage](../tutorial/medallion-and-lineage.md) | **New** |
| [19. Flows](../tutorial/flows.md) | **New** |

### Part 4: Connect it

| Chapter | In 0.9 |
|---|---|
| [20. Reception works in Slack](../tutorial/slack.md) | **New.** `connectors`, with `@3flows/platform-connector-slack` as the first provider |

### Part 5: Operate it

| Chapter | In 0.9 |
|---|---|
| [21. Operate it](../tutorial/operate-it.md) | As in 0.8 |
| [22. Look inside](../tutorial/admin-api.md) | **New.** `admins` and `Platform.inspect()` |
| [23. Keep secrets in a vault](../tutorial/vaults.md) | **New.** `vaults` with `memory`, `hashicorp`, `azure-key-vault` and `macos-keychain` |

### Part 6: Scale it

| Chapter | In 0.9 |
|---|---|
| [24. Separate processes](../tutorial/separate-processes.md) | **New.** `remotes` |
| [25. Discovery](../tutorial/discovery.md) | **New.** `registries` and `discovery` |
| [26. Workload identity](../tutorial/workload-identity.md) | **New.** `identities`, and the `platform-jwt` identity provider |

## Not in the tutorial yet

| | |
|---|---|
| Runtime instances | `Platform.create()` returns a runtime of its own: several applications, or several tests, in one process. See [Platform runtime](../concepts/platform-runtime.md) |
| Live reload | `Platform.reload()`, and `Platform.run(path, { watch: true })`. A configuration that fails to start leaves the previous one running |
| Singleton timers | With a [coordinator](../configuration/coordinators.md), a timer runs in one instance at a time. Types: `memory`, `http` and `azure-blob`. See [Singleton timers](../guides/singleton-timers.md) |
| Strict mode | `triggering.strict: true` turns warnings about unsafe defaults into startup errors: a timer that would run in every instance, an MCP server or ontology without `auth` |
| Idempotency | With an [`idempotencies`](../configuration/idempotencies.md) store, queue, email and SMS routes skip messages they have already handled |
| Flow runs from code | Lifecycle events, cancellation with an `AbortSignal`, `skipWhen`, `recover` and `otherwise`. See [`flows`](../configuration/pipelines-and-flows.md#steps) |
| Tools marked in code | A package can mark handlers as MCP tools, with safety hints. See [`mcps`](../configuration/mcps.md#handler-metadata) |
| More providers | `redis` and `mongo` for `vectors`, `microsoft` for `emails` |

## Known limits

- The descriptions of a domain reach the ontology and MCP, but not the GraphQL schema.
- Resuming a flow goes through the `flows` service: `Platform.get<Flows>('flows').resume(…)`.
- Discovery resolves a service to one registered instance. It doesn't balance load.
- `$vault` references are resolved when the configuration loads. A rotated secret reaches a provider with the next reload, or with a scheduled refresh.

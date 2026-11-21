---
title: Migrate from 0.8 to 0.9
sidebar_label: Migrate from 0.8
---

# Migrate from 0.8 to 0.9

Most of 0.9 is new and waits until you use it. A 0.8 application has to change in five places, and only the first one is always more than a rename:

| Step | What | Who is affected |
|---|---|---|
| [1](#step-1-upgrade) | Upgrade | Everyone |
| [2](#step-2-replace-mbs) | Replace `mbs` with `smss`, `emails`, `webhooks` and `mqs` | Applications that send or receive SMS, email or webhooks |
| [3](#step-3-rename-the-types) | Rename the types of `docs`, `kvs`, `blobs` and `mqs` | Code that names these types |
| [4](#step-4-make-the-handlers-keep-their-contracts) | Make the handlers keep their contracts | Everyone with handlers |
| [5](#step-5-decide-what-happens-to-failed-messages) | Decide what happens to failed messages | Applications with queue routes |
| [6](#step-6-check-the-small-things) | Check the small things | Have a look |

Go through the steps in this order. After each one, the application compiles and its tests can run, so you always know which step broke something.

Everything else works as before: services, `handlers`, `routes()`, `Platform.run()` and `Platform.shutdown()`, the calls on `doc()`, `kv()`, `blob()`, `vector()` and `mq()`, entities, your own GraphQL resolvers, `https`, `idps`, `timers`, policies and transformers.

## Before you start

- Be on the latest 0.8 with green tests. They're how you'll know that a step is done.
- Use Node.js 24 or later.
- Read [What's new in 0.9](./whats-new-0.9.md), so you know what the changes are for.

## Step 1: Upgrade

```sh
yarn up @3flows/platform@^0.9.0
yarn build
```

Applications that depend on `^0.8.x` don't move to 0.9 on their own: for a 0.x version, a caret range stays inside the minor version.

**Where it breaks.** The build fails wherever the code uses `mb()`, `route.mb()`, `MBMessage`, `Platform.services`, or the type names of step 3. And an application that still has an `mbs` section doesn't start:

```txt
ReferenceError: mbs is not defined
```

Every section of the YAML is started by a service of the same name, and `mbs` doesn't have one anymore. The next two steps fix both.

## Step 2: Replace `mbs`

0.8 had one message broker, `mbs`, with a `transport` for each kind of message. In 0.9, every kind is a primitive of its own, with its own section, its own fluent API and its own routes:

| 0.8 | 0.9 section | Types | In code | Routes |
|---|---|---|---|---|
| `transport: sms` | `smss` | `twilio`, `memory` | `sms()` | `route.sms()` |
| `transport: email` | `emails` | `standard`, `gmail`, `microsoft`, `memory` | `email()` | `route.email()` |
| `transport: http` | `webhooks` | `http` | `webhook()` | `route.webhook()` |
| `transport: mq` | `mqs` | `memory`, `rabbitmq`, `azure` | `mq()` | `route.mq()` |

### The YAML

`transport` and `type` become the section and its `type`. `services` and `parameters` stay as they are:

```yaml title="0.8"
mbs:
  - name: texts
    transport: sms
    type: twilio
    services:
      - name: AppointmentsService
    parameters:
      accountSid: ${{ TWILIO_ACCOUNT_SID }}
      authToken: ${{ TWILIO_AUTH_TOKEN }}
      from: '+15550009999'
```

```yaml title="0.9"
smss:
  - name: DEFAULT
    type: twilio
    services:
      - name: AppointmentsService
    parameters:
      accountSid: ${{ TWILIO_ACCOUNT_SID }}
      authToken: ${{ TWILIO_AUTH_TOKEN }}
      from: '+15550009999'
```

In 0.8, two entries in `mbs` needed two names. Now each section has its own `DEFAULT`, so `sms()` and `email()` work without a name.

### Sending

```ts title="0.8"
await this.mb('texts').transport().to(phone).body(`Hi ${name}, your appointment is confirmed.`).send();
```

```ts title="0.9"
await trigger.context.sms().to(phone).body(`Hi ${name}, your appointment is confirmed.`).send();
```

| | 0.9 |
|---|---|
| SMS | `sms().to(number).body(text).send()` |
| Email | `email().to(address).subject(subject).text(body).send()`, or `.html(body)`, `.json(body)` |
| Webhook | `webhook().to(url).path(path).json(body).send()`. The path was the `subject` in 0.8 |
| Queue | `mq().queue(name).send(body)`, as before |

### Receiving

`route.mb().for({ to, subject })` becomes a route of the primitive, with criteria that fit it:

```ts title="0.8"
route.mb('texts').for({ to: '+15550009999' }).do(async (message, trigger) => {
    const from = trigger.context.mbContext?.message?.from?.address;
});
route.mb('texts').all().do(/* … */);
```

```ts title="0.9"
route.sms().to('+15550009999').do(async (message, trigger) => {
    const from = trigger.context.smsContext?.message?.from?.address;
});
route.sms().any().do(/* … */);
```

| | Criteria | Message in the trigger context |
|---|---|---|
| `route.sms()` | `.from(…)`, `.to(…)`, `.anyFrom()`, `.anyTo()`, `.any()` | `smsContext.message`: an `SMSMessage` |
| `route.email()` | `.to(…)`, `.subject(…)`, `.anyTo()`, `.anySubject()`, `.any()` | `emailContext.message`: an `EmailMessage` |
| `route.webhook()` | `.to(…)`, `.path(…)`, `.anyTo()`, `.anyPath()`, `.any()` | `webhookContext.message`: a `WebhookMessage` |

Criteria accept `*` as a wildcard: `route.sms().from('+1555*')`.

`MBMessage` becomes `SMSMessage`, `EmailMessage` or `WebhookMessage`, and `TriggerType.MB` becomes `TriggerType.SMS`, `EMAIL` or `WEBHOOK`.

### Check

The build no longer mentions `mb`, and the application starts. This is also the moment to stop testing against real accounts. Give the tests a YAML with `type: memory`, and they send and receive without Twilio or a mailbox. [Chapter 3](../tutorial/confirm-by-sms.md) of the tutorial shows how.

## Step 3: Rename the types

The fluent calls on `doc()`, `kv()`, `blob()` and `mq()` are the same. The classes behind them have new names, which matters where your code names them, for example as a parameter type:

| 0.8 | 0.9 |
|---|---|
| `Collection` | `CollectionChain` |
| `Document` | `DocumentChain` |
| `Cursor`, `AggregationCursor` | `CursorChain`, `AggregationChain` |
| `Bracket`, `Pair` | `BracketChain`, `PairChain` |
| `Container`, `File` | `ContainerChain`, `FileTerminator` |
| `Queue`, `Topic` | `QueueChain`, `TopicChain` |
| `MQ`, as returned by `mq()` | `MQChain` |
| `S3Configuration`, `S3Parameters` | `S3BlobConfiguration`, `S3BlobParameters` |

Two things the compiler doesn't tell you clearly:

- **`Document` still exists, but it's something else**: a document of a vector store. Code that imports `Document` for a `docs` document compiles until it uses it. Search for the import.
- `Platform.get<MQ>(…)` returns the provider, not the fluent API. Use `this.mq()` or `trigger.context.mq()`, or call `.chain()` on the provider.

`Platform.services`, the map of all services, is gone. Use `Platform.listServices()`, `serviceIds()`, `serviceEntries()` or `serviceCount()`, or, better, [`Platform.inspect()`](../concepts/platform-runtime.md#inspecting-a-running-platform).

### Check

`yarn build` succeeds.

## Step 4: Make the handlers keep their contracts

From here on, everything compiles, and what's left is behavior. Run the tests now. The failures you see most likely come from this step.

In 0.8, the input schema of a handler was checked, but the handler got the request as it came, and nothing checked the answer. In 0.9, both schemas are enforced:

| | 0.8 | 0.9 |
|---|---|---|
| The `input` of the handler function | The request as sent | The **parsed** input: defaults filled in, fields that the schema doesn't declare removed |
| Invalid input over HTTP | `500 Internal Server Error` | `400` with `title: INVALID_INPUT` |
| Invalid input over JSON-RPC | `error.code: "Error"` | `error.code: "INVALID_INPUT"`, with the issues in `error.data` |
| `trigger.ok(value)` | Sent as it is | Checked against the output schema. A mismatch is `500` with `title: INVALID_OUTPUT`, and nothing is sent |
| A JSON-RPC result without a value | No `result` member | `"result": null` |

**Where it breaks.** Three cases, in the order you'll probably meet them:

1. **A handler reads a field that its schema doesn't declare.** It was there in 0.8, and it's `undefined` now:

   ```ts
   const Book = t.object({ name: t.string(), at: t.string() });

   handler('book', Book, Appointment, async (input, trigger) => {
       input.phone; // 0.8: whatever the client sent. 0.9: undefined, and a type error
   });
   ```

   Declare the field. If the handler really takes anything, say so with `t.any()` or `t.looseObject({ … })`.

2. **A handler answers something else than its output schema says**, often an internal field too many, or a missing ID. In 0.8 nobody noticed. Fix the schema or the answer, whichever is wrong.

3. **A client or a test expects the old errors**: a `500` for bad input, or the JSON-RPC code `Error`.

Routes that are plain functions, such as `route.http().get('/appointments/:id').do(fn)`, have no schemas and aren't affected.

### Check

The tests pass again, and `/openapi.json` shows what the handlers really accept and answer.

## Step 5: Decide what happens to failed messages

In 0.8, an error in a queue, SMS, email, webhook or timer route was written to the console, and that was it: the message counted as handled. In 0.9, the error is thrown to whatever delivered the message.

**Where it breaks.** A route that has always failed now and then starts to have consequences:

| `mqs` type | A queue route that throws, without a policy |
|---|---|
| `rabbitmq` | The message is rejected. It goes to the queue's dead-letter exchange, if it has one |
| `azure` | The message is abandoned and delivered again, up to the queue's maximum delivery count |
| `memory` | `send()` rejects with the route's error, because the memory queue delivers inside `send()`. A test that publishes a message can now fail because of its consumer |

Decide per queue what should happen, in YAML:

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

With `dlq`, a message that failed every attempt is sent to that queue with its error, and the delivery counts as done. Give the dead-letter queue a route that keeps what arrives, as in [chapter 6](../tutorial/dont-block-booking.md). See [`mqs`](../configuration/mqs.md#retry-and-dead-letters).

SMS, email and webhook routes have no such policy. For them, and wherever a failure really doesn't matter, handle the error in the route, where a reviewer sees it:

```ts
route.mq().queue('metrics').do(record).error((trigger, error) => {
    trigger.context.log().stack(error).warn();
});
```

Timer routes need nothing. A failing run is logged, counted in `platform_timer_failures_total` and shown in `Platform.inspect().timers`, and the next run happens as scheduled.

### Check

Make a route fail on purpose in a test, and check that the dead-letter route got the message.

## Step 6: Check the small things

| | 0.8 | 0.9 | Do |
|---|---|---|---|
| `identifies: api` in `auths` | Accepted | Startup fails: `Unsupported auth identifies api for …` | Use `service` or `user` |
| `https[].security.sessionSecret` | Had a built-in default | No default | Nothing, unless you relied on the default |
| HTTP routes and `basepath` | A route could match a path outside its service's `basepath` | It can't | Check clients that call such paths |
| WebSocket routes | Ignored `basepath` and `auths` | Live under the service's `basepath`, and require its `auths` | Connect to the right path, with a token |
| A route that throws in the HTTP dispatcher | Could end as `404` | `500` | Check clients that treat `404` as "not there" |
| `/ping`, OpenAPI, `version` | A constant | The `version` of the application's `package.json` | Set it |
| CSV with `headerNames` | The first data row was dropped | Every row is data | For a file with a header row, add `useFirstRowAsHeader: true` |
| CSV and SAX row splitting | The line ending of the host | `\n` | Set `eol` for files with other line endings |
| `${{ NAME }}` | Needed an `env` section | Also reads the process environment directly | Nothing |

## You're done

Check it the way [chapter 22](../tutorial/admin-api.md) does:

```ts
const manifest = Platform.inspect();

manifest.instance.platformVersion;   // 0.9.x
manifest.services;                   // your services and their contracts
manifest.providers;                  // sms::twilio::default, email::standard::default, …
```

## What to adopt next

Nothing here is required. Pick what removes code you have today:

| If your 0.8 application has… | Use | Tutorial |
|---|---|---|
| Tests that need a Twilio account or a mailbox | `type: memory` for `smss` and `emails` | [3](../tutorial/confirm-by-sms.md) |
| HTTP clients for your own services | `service(name)` and `remotes` | [7](../tutorial/notifications-service.md), [24](../tutorial/separate-processes.md) |
| Find-or-create code against duplicates | A domain with natural keys | [9](../tutorial/domain.md), [11](../tutorial/natural-keys.md) |
| GraphQL resolvers for entities | `graphqls` with `domains` | [10](../tutorial/graphql.md) |
| Handlers that parse files and loop over records | Pipelines and dead letters | [15](../tutorial/pipelines.md), [17](../tutorial/dead-letters.md) |
| A SQL client and a cron job | `sqls` and a pipeline with a timer trigger | [16](../tutorial/sync-from-a-database.md) |
| Status fields and "check again later" handlers | Flows | [19](../tutorial/flows.md) |
| A webhook route for Slack | A connector | [20](../tutorial/slack.md) |
| Passwords in environment variables | `vaults` and `$vault` | [23](../tutorial/vaults.md) |
| The same timer firing in every instance | A coordinator and singleton timers | [Guide](../guides/singleton-timers.md) |
| Shared API keys between your services | Workload identity | [26](../tutorial/workload-identity.md) |
| An AI assistant that should use the application | `mcps` | [13](../tutorial/mcp.md) |

## Coming from a 0.9 prerelease

If you already run a `0.9.0-next` build, switch the dependency from `next` to `^0.9.0`; the `next` tag now carries preview builds of the version after 0.9.0. These changed along the way:

| Since | Change | Do |
|---|---|---|
| `next.14` | Contracts are enforced, as in [step 4](#step-4-make-the-handlers-keep-their-contracts). `Platform.services` is gone | Step 4 |
| `next.21` | Routes that throw fail the delivery, as in [step 5](#step-5-decide-what-happens-to-failed-messages) | Step 5 |
| `next.21` | A connector's `useHttp` mounts only its event intake, `/connectors/<name>/events`. Its operations are no longer on that server | Expose the connector as a service where you called its operations over HTTP, as the samples do for `slack-memory`'s `outbox` and `inject`. See [`connectors`](../configuration/connectors.md#exposing-operations-over-http) |
| `next.21` | `Platform.inspect().instance.platformVersion` is the platform's version. Your application's is `applicationVersion` | Check tests and dashboards that read it |
| After `next.21` | An MCP service without `handlers` exposes only the handlers that are marked as tools, if it has any | List `handlers` where you relied on "all" |
| After `next.21` | GraphQL input enums have type names of their own | Check queries that name these types |
| After `next.21` | Pipeline and flow timers follow the same ownership as `timers`: singleton, when there's a `DEFAULT` coordinator | Nothing |

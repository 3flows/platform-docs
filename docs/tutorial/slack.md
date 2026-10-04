---
title: 20. Reception works in Slack
---

# 20. Reception works in Slack

**Where we are:** the referral flow from the [last chapter](./flows.md) texts reception a run ID and waits until someone calls `reviewReferrals` with it.

**What we want:** reception gets the question where they already work, in their Slack channel, and answers with a reaction: ✅ to accept, ❌ to decline.

## The obvious way

Two pieces. Posting a message is a call to Slack's Web API with a bot token:

```ts
await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: 'C0RECEPTION', text: '3 referrals from Hopper Family Practice are waiting…' })
});
```

Reactions arrive through Slack's Events API: Slack posts every event to a URL of yours. So: an HTTP route that resumes the flow.

```ts
route.http().post('/slack/events').do(async (_params, trigger) => {
    const { event } = trigger.context.httpContext!.request.body;
    if (event.type !== 'reaction_added') return trigger.ok();
    await Platform.get<Flows>('flows').resume({
        event: 'referrals.reviewed',
        correlation: event.item.ts, // the message reception reacted to
        payload: { accepted: event.reaction === 'white_check_mark', by: event.user }
    });
    await trigger.ok();
});
```

Point Slack at it, react with ✅, and the batch is imported.

## Where it breaks

Try the route the way the internet will:

```sh
# Anybody who can reach the URL can approve a batch, as anybody:
curl -X POST localhost:3000/slack/events -H 'Content-Type: application/json' \
  -d '{"event":{"type":"reaction_added","user":"U0GRACE","reaction":"white_check_mark","item":{"ts":"1791147461.001"}}}'
```

- **No verification.** Slack signs every request with your app's signing secret: an HMAC over a timestamp and the **raw** request body. By the time your route runs, the JSON parser has consumed the raw body, so you can't even check it without reworking the HTTP server.
- **Retries.** Slack wants a `200` within three seconds. Our route runs the import pipeline before it answers, so on a big batch Slack gives up and sends the **same event again**, up to three times. The second delivery resumes a flow that isn't waiting anymore, fails with `500`, and Slack retries that, too.
- **Failures vanish.** When resuming fails for a real reason (the database is down), the event is gone. Slack doesn't keep it.
- **The handshake.** Before Slack sends anything, it checks the URL with a `url_verification` challenge your route has to answer.
- The bot token is in the environment, and every developer and every test needs a Slack workspace.

Every one of these is solvable. Together they're a few hundred lines of security-sensitive plumbing per external application, and Slack is only the first.

## The concept: connectors

A **connector** connects the platform to an external application. It comes in a package, one per provider, and the platform runs it:

- Its **operations are handlers**, such as `messages.send`, with contracts, like any service.
- Its **events are routes**: `route.connector(name).event(type).do(...)`.
- The platform runs the **intake**: it verifies the provider's signature against the raw body, answers handshakes, acknowledges right away, drops duplicates, and delivers each event through a queue, with retries and a dead-letter queue.

Add the Slack connector to the project:

```sh
yarn add @3flows/platform-connector-slack@next
```

**Ask in Slack.** `ReceptionService` gets a handler that posts the question. The package's `slack` helper calls the connector's `messages.send` operation:

```ts title="reception.ts"
import { ConnectorEvent, Flows, Platform, Register, Route, Service, handler, t } from '@3flows/platform';
import { SlackReactionEvent, slack } from '@3flows/platform-connector-slack';

/** The Slack channel reception works in. In a real deployment, this would come from configuration. */
export const RECEPTION_CHANNEL = 'C0RECEPTION';

/** Reception decides with a reaction on the review message. */
const ACCEPT = 'white_check_mark';
const DECLINE = 'x';

// inside ReceptionService.handlers
// Ask reception in its Slack channel. The message's timestamp identifies the batch from now on.
handler(
    'askForReview',
    t.object({ practice: t.string(), count: t.number() }),
    t.object({ ts: t.string() }),
    async ({ practice, count }, trigger) => {
        const message = await slack(trigger.context)
            .connector('reception')
            .channel(RECEPTION_CHANNEL)
            .message(`${count} referrals from ${practice} are waiting for review. React with :${ACCEPT}: to accept or :${DECLINE}: to decline.`)
            .send();
        await trigger.ok({ ts: message.ts! });
    }
)
```

**Decide in Slack.** A connector route turns a reaction into the flow's event. The `reviewReferrals` handler is gone:

```ts title="reception.ts"
type Reaction = t.infer<typeof SlackReactionEvent>;
/** What the connector delivers when a Slack event can't be handled, even after its retries. */
type FailedEvent = { type: string; event: ConnectorEvent; attempts: number; error: { message: string } };

routes(): Route {
    const route = super.routes();

    // highlight-start
    // A reaction on a review message is reception's decision. It resumes the flow that waits for that message.
    route.connector('reception').event('reaction.added').do(async (event, trigger) => {
        const { payload } = event as ConnectorEvent<Reaction>;
        if (payload.item?.channel !== RECEPTION_CHANNEL) return;
        if (payload.reaction !== ACCEPT && payload.reaction !== DECLINE) return;

        await Platform.get<Flows>('flows').resume({
            event: 'referrals.reviewed',
            correlation: payload.item.ts!,
            payload: { accepted: payload.reaction === ACCEPT, by: payload.user ?? 'unknown' }
        });
    });
    // highlight-end

    // Slack events that still failed after their retries. Nothing is lost: here they are, with the error.
    route.mq().queue('reception.failed').do(async (failure, trigger) => {
        const { type, event, attempts, error } = failure as FailedEvent;
        trigger.context.log().stack(`Slack event ${type} ${event.id} failed ${attempts} times: ${error.message}`).warn();
        await trigger.context.doc().db('datahub').collection('failed_events').by(event.id).set(failure as FailedEvent);
    });

    return route;
}
```

**The flow** asks `ReceptionService` instead of texting, and waits for a reaction on exactly the message it posted. The Slack message timestamp is the correlation:

```ts title="flows.ts"
// 1. Ask reception in Slack. Slack fails now and then, so try three times.
.step('notify-reception')
    // highlight-start
    .call('ReceptionService')
    .method('askForReview')
    .input((ctx: Context) => ({ practice: ctx.input.practice, count: ctx.input.referrals.length }))
    // highlight-end
    .retry({ attempts: 3, backoffMs: 1000 })

// 2. Wait for the review: a reaction on exactly that Slack message. That can take days.
.waitFor('review')
    .event('referrals.reviewed')
    // highlight-next-line
    .correlate((ctx: Context) => ctx.step('notify-reception')?.result.ts)
    .timeout('3d')
```

`NotificationsService.referralsReceived` and the reception phone number are gone. Notifications still tells the practice by SMS.

**The YAML** says which Slack, and how events are handled:

```yaml title="platform.yml"
https:
  - name: api
    port: 3000
    # … unchanged
  # highlight-start
  # Slack's side of the app: the connector's inbound events and, with slack-memory, its outbox and inject.
  - name: slack
    port: 3002
  # highlight-end

mqs:
  - name: DEFAULT
    type: memory
    use:
      - NotificationsService
      - CrmCustomersPipeline
      # highlight-next-line
      - ReceptionService # Slack events are delivered to its connector routes through a queue

# highlight-start
# Reception's Slack workspace. Operations are handlers, events are routes. slack-memory needs no workspace.
connectors:
  - name: reception
    type: slack-memory # slack in production, with a bot token and signing secret
    useHttp: slack # Slack posts its events to /connectors/reception/events on this server
    events:
      retry:
        attempts: 3
        backoffMs: 200
      dlq:
        queue: reception.failed # events that still fail after three attempts
# highlight-end
```

`slack-memory` has the same operations, events and schemas as `slack`, without a workspace. Messages go to an outbox you can read, and you play Slack by injecting events. Switching to the real thing is `type: slack` and two credentials.

:::caution
Give the connector an `https` server of its own, as here. `useHttp` currently mounts **all** of the connector's routes on that server, not only `/connectors/reception/events`: also its JSON-RPC endpoint and its operations, such as `/messages.send`, without authentication. Next to services at the root of a server, startup fails with `POST /.jsonrpc … already in use`. In production, expose only the events path to Slack, for example with an ingress rule.
:::

## Run it again

```sh
yarn step:20
curl -X POST localhost:3000/data/flows/referrals -H 'Content-Type: application/json' -d @referrals.json
```

The flow waits, now for a Slack message:

```json
{
  "runId": "3d640d62-…",
  "status": "waiting",
  "steps": {
    "notify-reception": { "type": "service", "status": "succeeded", "result": { "ts": "1791147461.001" }, … },
    …
  },
  "waiting": { "step": "review", "event": "referrals.reviewed", "correlation": "1791147461.001", … }
}
```

What did the app post to Slack?

```sh
curl -X POST localhost:3002/outbox
```

```json
{
  "messages": [
    {
      "channel": "C0RECEPTION",
      "text": "3 referrals from Hopper Family Practice are waiting for review. React with :white_check_mark: to accept or :x: to decline."
    }
  ],
  "reactions": [],
  "files": []
}
```

Now be Grace, and react with ✅. Use the `ts` from the flow's response:

```sh
curl -X POST localhost:3002/inject -H 'Content-Type: application/json' -d '{
  "id": "Ev01", "type": "reaction.added",
  "payload": { "type": "reaction_added", "user": "U0GRACE", "reaction": "white_check_mark",
               "item": { "type": "message", "channel": "C0RECEPTION", "ts": "1791147461.001" } } }'
```

```json
{ "ok": true, "delivered": 1 }
```

The flow resumes: the batch is imported, the practice gets its SMS, and the run's output says `"by": "U0GRACE"`. That's the Slack user, which Slack signed for, not a name someone typed.

**Slack sends the same event again:** send the same request once more.

```json
{ "ok": true, "delivered": 0 }
```

Dropped. Nothing ran twice.

**A reaction that can't be handled:** Ada reacts with ❌ after Grace has decided. No flow is waiting for that message anymore, so the route fails. Send it with `"id": "Ev02"`, `"user": "U0ADA"` and `"reaction": "x"`. The log shows:

```txt
[WARN] … ReceptionService • Slack event reaction.added Ev02 failed 3 times: No waiting flow for referrals.reviewed:1791147461.001
```

Three attempts, then the dead-letter queue, where `ReceptionService` keeps it in `datahub.failed_events` with the error. Nothing is lost, and nothing is retried forever.

The connector reports its health in the runtime manifest, which [chapter 22](./admin-api.md) introduces:

```ts
Platform.inspect().connectors[0].health;
// { configured: true, receivedEvents: …, deliveredEvents: …, duplicateEvents: …, failedEvents: 1,
//   lastError: { message: 'No waiting flow for referrals.reviewed:…' }, … }
```

## Connector building blocks

| Part | What it does |
|---|---|
| `connectors[]` | `name`, `type` (`slack`, `slack-memory`, …), `parameters` (credentials, as `$vault` references), `useHttp` and `path` for inbound events |
| Operations | Handlers of the connector service. Call them with the package's helper, `trigger.context.connector(name).call(method, input)`, or `service(name)` |
| Events | `route.connector(name).event(type).do(fn)`. Delivered through the queue `connectors.<name>.events`, or `events.queue`. The service needs an `mqs[].use` entry |
| Intake | `POST /connectors/<name>/events`: signature check, handshake, parse, duplicate check, enqueue, `200` |
| Duplicates | Events are claimed by provider event ID in the `idempotencies` store, for `events.idempotency.ttlSeconds` (default one day) |
| Retries | `events.retry.attempts` and `backoffMs` for routes that throw |
| Dead letters | `events.dlq.queue`: failed events with the connector, type, event, attempts and error |
| Health | `Platform.inspect().connectors`: configured, authenticated, received, delivered, duplicate and failed events, last error |

## Going to production

```yaml title="platform.yml (production)"
idempotencies:
  - name: DEFAULT   # where the intake remembers which events it has seen
    type: memory

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
      idempotency:
        ttlSeconds: 86400
      retry: { attempts: 3, backoffMs: 1000 }
      dlq: { queue: reception.failed }
```

The `$vault` references come in [chapter 23](./vaults.md). In Slack's app configuration, the event request URL is `https://<your host>/connectors/reception/events`, and the bot needs the `chat:write` and `reactions:read` scopes and the `reaction_added` event.

## What you learned

- **External applications go through connectors.** Operations are handlers, events are routes, and the platform owns verification, acknowledgement, duplicates, retries and dead letters.
- **A memory type makes the provider testable.** `slack-memory` has an outbox and accepts injected events, with the same schemas as Slack.
- A flow can wait for anything that can resume it, including a reaction in Slack.

## Reviewer's view

> The referral flow asks reception in the `C0RECEPTION` Slack channel. A ✅ or ❌ reaction on that message, by a Slack user, decides. Duplicate events are dropped; events that fail three times are kept in `datahub.failed_events`.

The review questions: *who is in that channel?* Everybody in it can approve a batch now. *Who reads `failed_events`?* And `askForReview` is a handler of `ReceptionService`, which is exposed at `/reception`: anybody who can reach it can make the app post to the reception channel. Exposure is configuration; [chapter 26](./workload-identity.md) shows how to require callers to identify themselves.

[Sample: step 20](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/20-slack) · Next: [Part 5: Operate it](./operate-it.md)

---
title: 17. Flows
---

# 17. Flows

**Where we are:** data arrives through the booking API, GraphQL, CSV uploads, CRM messages and a nightly SQL sync. Pipelines turn it into customers and appointments, keep dead letters and record lineage.

**The problem:** the partner practice from [chapter 14](./sync-from-a-database.md) now wants to **refer patients** to us. When they can't take a patient, they send a batch:

```json title="referrals.json"
{
  "practice": "Hopper Family Practice",
  "contact": "+15550000200",
  "referrals": [
    { "name": "Dorothy Vaughan", "phone": "+15550000011", "at": "2030-02-01T09:00:00.000Z" },
    { "name": "Mary Jackson", "phone": "+15550000012", "at": "2030-02-01T10:00:00.000Z" },
    { "name": "No Phone", "phone": "", "at": "2030-02-01T11:00:00.000Z" }
  ]
}
```

Every record so far went live the moment it arrived. Reception says no to that here: *nobody on that list gets a text message from us before we've looked at it.* Maybe we don't have capacity that week. Maybe the list is wrong, and we'd text people who never asked for it. Reviewing a batch can take a day or two. Then the practice needs an answer.

That's a process with four steps: **tell reception, wait for the decision, import if accepted, tell the practice.**

Try to build it with what we have:

- A handler can't wait two days for an answer.
- A pipeline streams records from a source to a sink in one go. There's no *"wait for reception"* step in the middle.
- So it becomes two handlers, a "pending batch" document with a `status` field, and questions nobody can answer by reading the code: *Did the SMS to reception go out, or did it fail halfway? Was this batch already reviewed? What if the answer comes a week later?*

The process exists, but only as a status field and the code around it. What we want to write down is the process itself: its steps in order, what may be retried, and where it waits.

## The solution: a flow

A flow is a service that declares a process: triggers, steps and what happens between them. The platform runs it, records every step and keeps the run while it waits.

```ts title="flows.ts"
/** A partner practice refers patients: POST /data/flows/referrals. */
@Register()
export class ReferralFlow extends Flow {
    define() {
        return this.flow('referrals')
            .on.http().post('/referrals')
            .from.trigger().payload()

            // 1. Tell reception that a batch is waiting. SMS providers fail now and then, so try three times.
            .step('notify-reception')
                .call('NotificationsService')
                .method('referralsReceived')
                .input((ctx: Context) => ({ runId: ctx.runId, practice: ctx.input.practice, count: ctx.input.referrals.length }))
                .retry({ attempts: 3, backoffMs: 1000 })

            // 2. Wait for the review. That can take days. Meanwhile, the run is a document, not a process.
            .waitFor('review')
                .event('referrals.reviewed')
                .correlate((ctx: Context) => ctx.runId)
                .timeout('3d')

            // 3. Only an accepted batch becomes customers and appointments, through a pipeline.
            .when('accepted', (ctx: Context) => review(ctx).accepted)
                .step('import')
                    .pipeline('referral-import')
                    .input((ctx: Context) => ctx.input.referrals)
            .end()

            // 4. Tell the practice what happened to its referrals.
            .step('notify-practice')
                .call('NotificationsService')
                .method('referralsReviewed')
                .input((ctx: Context) => ({
                    phone: ctx.input.contact,
                    accepted: review(ctx).accepted,
                    booked: booked(ctx),
                    referred: ctx.input.referrals.length
                }))
                .retry({ attempts: 3, backoffMs: 1000 })

            .output((ctx: Context) => ({ accepted: review(ctx).accepted, by: review(ctx).by, booked: booked(ctx) }));
    }
}
```

Read it top to bottom: it's the process from the problem statement, in the same order. The helpers are small:

```ts title="flows.ts"
/** What reception decided. It arrives later, when the flow is resumed. */
export type Review = { accepted: boolean; by: string };

type Context = FlowContext<ReferralBatch>;
const review = (ctx: Context) => ctx.event as Review;

/** Referrals that became appointments: everything the import read, minus what it rejected. */
function booked(ctx: Context): number {
    const report = ctx.step('import')?.report;
    return report ? report.read - report.invalid : 0;
}
```

`ctx.input` is what started the flow, `ctx.event` is what resumed it, and `ctx.step(name)` is the result of an earlier step. Every step can see what happened before it.

### The flow uses what's already there

**Service calls** are the ones from [chapter 7](./notifications-service.md). `NotificationsService` gets two handlers, `referralsReceived` and `referralsReviewed`, because it still decides *how* people are told.

**The import is a pipeline**, without a trigger of its own. The flow runs it. Referrals arrive in the clean shape `{ name, phone, at }`, so the silver-to-gold mapping from the [last chapter](./medallion-and-lineage.md) works unchanged:

```ts title="pipelines.ts"
/** Accepted referrals become customers and appointments. It has no trigger of its own: the ReferralFlow runs it. */
@Register()
export class ReferralImportPipeline extends Pipeline {
    define() {
        return this.pipeline('referral-import')
            .on.manual()
            .toEntities(fromCleanRow) // referrals arrive in the clean shape, so they map like silver rows
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters')
            .lineage().to.doc().db('datahub').collection('lineage');
    }
}
```

### Reception decides

The flow waits for the event `referrals.reviewed`, correlated by its run ID. A small `ReceptionService` shows what's waiting and delivers the decision:

```ts title="reception.ts"
// Referral batches waiting for a decision. Flow runs are documents, so this is a query.
handler('pendingReviews', t.object({}).optional(), t.array(PendingReview), async (_input, trigger) => {
    const runs = await trigger.context
        .doc()
        .db('datahub')
        .collection('flow_runs')
        .find({ name: 'referrals', status: 'waiting' })
        .sort({ startedAt: 1 })
        .all<any>();

    await trigger.ok(
        runs.map(({ runId, input, startedAt }) => ({ runId, practice: input.practice, referrals: input.referrals, since: startedAt }))
    );
}),

// Reception's decision resumes the waiting flow exactly where it stopped.
handler('reviewReferrals', ReviewReferrals, ReviewResult, async ({ runId, accepted, by }, trigger) => {
    // highlight-start
    const report = await Platform.get<Flows>('flows').resume({
        event: 'referrals.reviewed',
        correlation: runId,
        payload: { accepted, by }
    });
    // highlight-end
    await trigger.ok({ status: report.status, output: report.output });
})
```

The `payload` becomes `ctx.event` in the flow.

### YAML

```yaml title="platform.yml"
services:
  - name: AppointmentsService
  - name: NotificationsService
  - name: DataExchangeService
  # highlight-next-line
  - name: ReceptionService

pipelines:
  register:
    - name: AppointmentImportPipeline
    - name: CrmCustomersPipeline
    - name: PracticeSyncPipeline
    # highlight-next-line
    - name: ReferralImportPipeline

# highlight-start
# Flows are services too. Their runs are kept in docs, so a flow can wait for days and survive restarts.
flows:
  state:
    type: doc
    db: datahub
    collection: flow_runs
  register:
    - name: ReferralFlow
# highlight-end

https:
  - name: api
    port: 3000
    services:
      # …
      # highlight-start
      - name: ReferralFlow
        basepath: /data/flows
      - name: ReceptionService
        basepath: /reception
      # highlight-end
```

`flows.state` says where runs are kept: the `docs` store that's already there.

## Run it

```sh
yarn step:17
curl -X POST localhost:3000/data/flows/referrals -H 'Content-Type: application/json' -d @referrals.json
```

The flow runs until it has to wait, and answers with its run so far:

```json
{
  "runId": "25f0ce23-3f6c-42a1-90cc-5640368ef24e",
  "name": "referrals",
  "status": "waiting",
  "steps": {
    "notify-reception": { "type": "service", "status": "succeeded", "attempts": 1, "result": { "sent": true }, … },
    "review": { "type": "wait", "status": "succeeded", "result": { "event": "referrals.reviewed", … }, … }
  },
  "waiting": {
    "step": "review",
    "event": "referrals.reviewed",
    "correlation": "25f0ce23-3f6c-42a1-90cc-5640368ef24e",
    "resumeFrom": 2,
    "timeoutAt": "2026-10-01T10:41:38.648Z"
  },
  …
}
```

Reception's phone gets `3 referrals from Hopper Family Practice are waiting for review: 25f0ce23-…`. Nobody has been imported, and nobody on the list has been texted.

Nothing is running now. The run is a document in `datahub.flow_runs`, and reception can see it:

```sh
curl -X POST localhost:3000/reception/pendingReviews
```

```json
[
  {
    "runId": "25f0ce23-3f6c-42a1-90cc-5640368ef24e",
    "practice": "Hopper Family Practice",
    "referrals": [ … ],
    "since": "2026-09-28T10:41:38.647Z"
  }
]
```

Reception accepts the batch:

```sh
curl -X POST localhost:3000/reception/reviewReferrals -H 'Content-Type: application/json' \
  -d '{"runId":"25f0ce23-3f6c-42a1-90cc-5640368ef24e","accepted":true,"by":"Grace"}'
```

```json
{ "status": "succeeded", "output": { "accepted": true, "by": "Grace", "booked": 2 } }
```

The flow continued where it stopped: the pipeline imported the batch, and the practice got `Your referrals were accepted: 2 of 3 patients are booked.` The referral without a phone number is a [dead letter](./dead-letters.md) of `referral-import`. Dorothy and Mary are regular customers now, and they'll get their reminders.

The run in `datahub.flow_runs` has every step:

| Step | Type | Status |
|---|---|---|
| `notify-reception` | service | succeeded, 1 attempt |
| `review` | wait | succeeded |
| `accepted` | condition | succeeded, result `true` |
| `import` | pipeline | succeeded, with the pipeline report |
| `notify-practice` | service | succeeded, 1 attempt |

Send the same review again, and it fails: `No waiting flow for referrals.reviewed:25f0ce23-…`. A batch is reviewed once. A declined batch skips `import`, and the practice is asked to call reception.

## Building blocks

| Part | Options |
|---|---|
| Triggers `.on` | `http().post(path)` (and `get`, `put`, `patch`, `delete`), `mq().queue(name)`, `mq().topic(name, pattern)`, `timer(cron)`, `manual()` |
| Input `.from` | `trigger().payload()`, `.body()`, `.parameters()`, `.message()`, `.envelope()` |
| Steps | `step(name).do(fn)`, `step(name).call(service).method(name).input(fn)`, `step(name).pipeline(name).input(fn)` |
| Waiting | `waitFor(name).event(event).correlate(fn)`, resumed with `Flows.resume({ event, correlation, payload })` |
| Branching | `when(name, predicate) … end()`, and `parallel(name).branch(name) … endBranch() … end()` to run branches at the same time |
| Policies | `.retry({ attempts, backoffMs })`, `.timeout('30s')` and `.compensate(fn)`, for the step right before them |
| Result | `.output(fn)` builds the result of the run from `ctx.input`, `ctx.event` and `ctx.step(name)` |
| State | `flows.state` in YAML, or `.state().doc().db(...).collection(...)` per flow. Waits are kept in `<collection>_waits` |

If a step fails after its retries, the run fails. Steps that already succeeded and declare `.compensate(fn)` are compensated in reverse order, so a flow can undo what it started.

A wait's timeout is checked when the event arrives: a review after three days is refused, and the run fails.

:::note
With `docs` of `type: memory`, waiting runs are gone after a restart, like all other data. With MongoDB or PostgreSQL behind `docs`, a waiting flow survives restarts and deployments, and any instance with the same `flows.state` can resume it.
:::

## Pipelines or flows?

| | Pipeline | Flow |
|---|---|---|
| Moves | Records | A process |
| Runs | From source to sink, in one go | Step by step. It can stop and wait |
| Handles errors | Per stage: fail, skip or dead letter | Per step: retry, timeout, compensate |
| Records | A run report, dead letters, lineage | Every step with its input, result and attempts |

They work together: a flow step can run a pipeline, and keeps its report.

## What you learned

- **A flow is a process as a declaration:** steps, waits, conditions and retries, in the order they happen.
- **Waiting is state, not a sleeping process.** A waiting run is a document. An event with the right correlation resumes it where it stopped.
- Flows orchestrate what you already have: service calls from Part 1, pipelines from Part 3.

## Reviewer's view

> A referral batch notifies reception and waits up to three days for a review. Only an accepted batch is imported, through `referral-import`. Referrals without a valid phone number become dead letters. The practice is told either way. `reviewReferrals` resumes the flow.

Two questions for the review: *who may call `reviewReferrals`?* It decides whether strangers get text messages from us, so it needs `auth`. And *who looks at batches nobody reviewed?* They stay `waiting` in `pendingReviews` until someone does.

[Sample: step 17](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/17-flows) · Next: [Part 4: Operate it](./operate-it.md)

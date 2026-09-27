---
title: 18. Dead letters
---

# 18. Dead letters

**Where we are:** three pipelines feed customers and appointments: CSV uploads, CRM messages and a nightly SQL sync.

**The problem:** the import skips invalid rows. The report says `"invalid": 2`, but not *which* rows, or *why*. The practice asks: *"Two of my appointments are missing. Which ones?"* We can't answer.

The CRM pipeline is worse. It still has the strict default, so a single message without a phone number fails the run. Depending on the broker, the message is then lost, or redelivered and failing again and again.

Skipping loses data silently. Failing stops everything for one bad record. We need a third option.

## The solution: dead letters

A dead letter is a record a pipeline couldn't process, **kept with its input and the error**, so someone can look at it, fix the source and send it again.

Two lines per pipeline. In the import, they replace `.onError('entity').skip()`:

```ts title="pipelines.ts"
export class AppointmentImportPipeline extends Pipeline {
    define() {
        return this.pipeline('appointment-import')
            .on.http().post('/appointments')
            .from.trigger().stream()
            .parse.csv({ delimiter: ';' })
            .toEntities(fromLegacyRow)
            // highlight-start
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters')
            // highlight-end
            .save({ batchSize: 500 });
    }
}

export class CrmCustomersPipeline extends Pipeline {
    define() {
        return this.pipeline('crm-customers')
            .on.mq().queue('crm-customers')
            .from.trigger().payload()
            .toEntity(Customers, { name: (customer) => customer.fullName })
            // highlight-start
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters');
            // highlight-end
    }
}
```

Dead letters are documents in `docs`, in the `datahub` database. A small handler makes them visible:

```ts title="exchange.ts"
// Records the pipelines could not process, newest first, with the input as it arrived.
handler('deadLetters', t.object({}).optional(), t.array(DeadLetter), async (_input, trigger) => {
    const deadLetters = await trigger.context
        .doc()
        .db('datahub')
        .collection('dead_letters')
        .find({})
        .sort({ createdAt: -1 })
        .all<any>();

    await trigger.ok(
        deadLetters.map(({ pipeline, runId, stage, input, error, createdAt }) => ({
            pipeline,
            runId,
            stage,
            input,
            error: error.message,
            createdAt
        }))
    );
}),
```

**No YAML changes.** Dead letters use the `docs` store that's already there.

## Run it

```sh
npm run step:18
curl -X POST localhost:3000/data/imports/appointments -H 'Content-Type: text/csv' --data-binary @legacy.csv
# { …, "written": 4, "invalid": 2, "deadLettered": 2 }
curl -X POST localhost:3000/data/deadLetters
```

```json
[
  {
    "pipeline": "appointment-import",
    "runId": "7c0d5b8e-…",
    "stage": "entity",
    "input": { "Name": "Bad Date", "Mobile": "+1 555 000 0004", "Date": "someday", "Notes": "" },
    "error": "Date someday is not in the format YYYY-MM-DD HH:mm",
    "createdAt": "2026-09-27T15:41:05.291Z"
  },
  {
    "pipeline": "appointment-import",
    "runId": "7c0d5b8e-…",
    "stage": "entity",
    "input": { "Name": "No Phone", "Mobile": "", "Date": "2030-01-16 11:00", "Notes": "" },
    "error": "Key field phone of Customer is missing",
    "createdAt": "2026-09-27T15:41:05.290Z"
  }
]
```

Now we can answer the practice: *"Two rows: one has no phone number, one has the date `someday`."* A CRM message without a phone number ends up in the same place, and the queue keeps flowing.

## Error policies

Every stage of a pipeline has its own policy:

| Stage | Covers |
|---|---|
| `transform` | `map` and `mapBatch` steps that throw |
| `entity` | records that can't be mapped or fail validation |

| Action | Effect |
|---|---|
| `fail()` | Default. The run stops and fails, the error is in the report |
| `skip()` | The record is dropped and counted |
| `deadLetter()` | The record is written to the dead-letter target with its stage, input, error, run ID and the assets involved |

A dead letter contains everything needed to reprocess it: the input exactly as the stage received it, and the `runId` to find the run it belongs to.

## What you learned

- **Bad data is data too.** Keep it, with the reason, instead of hiding it or stopping for it.
- Error handling is declared per stage, next to the pipeline, where a reviewer sees it.

## Reviewer's view

> Records that fail in the entity stage of `appointment-import` or `crm-customers` are written to `datahub.dead_letters` with the input and the error. `deadLetters` lists them.

The review question: *who looks at the dead letters, and how often?* A dead-letter collection that nobody reads is just a slower way of skipping.

[Sample: step 18](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/18-dead-letters) · Next: [Medallion layers and lineage](./medallion-and-lineage.md)

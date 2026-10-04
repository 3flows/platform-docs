---
title: 18. Medallion layers and lineage
---

# 18. Medallion layers and lineage

**Where we are:** three pipelines feed the domain model. Records that can't be processed become dead letters.

**What we want:** answers to two questions that come up as soon as data arrives from several places.

## The obvious way

That's what we have: every pipeline maps its source straight into the model. The CSV row becomes a customer and an appointment in one step, `fromLegacyRow`, and the row itself is gone.

## Where it breaks

- *"We found a bug in the phone number cleanup. Can we re-run last month's imports?"* No. The rows are gone. Only the result of the old mapping is left, and the practice won't send last month's files again.
- *"Where do our customers come from?"* The data can't tell. A customer looks the same whether it was booked, imported, synced or sent by the CRM. The obvious fix, a `source` field on every entity, is one more thing every pipeline has to remember to set, and it still doesn't say *which run*.

We need to **keep data at each stage** of its way in, and **record what every pipeline read and wrote.**

## The concept: bronze, silver, gold, and lineage

The medallion pattern gives each stage a name:

| Layer | Holds | Here |
|---|---|---|
| **Bronze** | Raw data, exactly as it arrived | CSV rows of the old system |
| **Silver** | Cleaned data: consistent names, formats and types | `{ name, phone, at }` |
| **Gold** | The domain model | `Customer` and `Appointment` entities |

The mapping splits into two parts. Cleaning moves to a `map` step, and the clean rows use the field names of the domain, so auto mapping does the rest:

```ts title="legacy.ts"
/** Bronze → silver: rename columns, normalize phone numbers and dates, drop the notes. */
export const cleanLegacyRow = (row: LegacyRow): CleanRow => ({
    name: row.Name.trim(),
    phone: row.Mobile.replaceAll(' ', ''),
    at: toIsoDate(row.Date)
});

/** Silver → gold: clean rows map onto the domain by name. Only the relationship is explicit. */
export const fromCleanRow: EntityTarget<CleanRow>[] = [
    { entity: Customers },
    { entity: Appointments, fields: { customer: ref(Customers) } }
];
```

The pipeline marks the layers and keeps a copy of each. The layered steps replace the single `.toEntities(fromLegacyRow)`:

```ts title="pipelines.ts"
return this.pipeline('appointment-import')
    .on.http().post('/appointments')
    .from.trigger().stream()
    .parse.csv({ delimiter: ';' })
    // highlight-start
    .bronze() // raw: every row exactly as it arrived, kept for replay and audits
    .doc().db('bronze').collection('legacy_appointments')
    .map(cleanLegacyRow)
    .silver() // clean: consistent names, phone numbers and dates
    .doc().db('silver').collection('appointments')
    .gold() // the domain model
    .toEntities(fromCleanRow)
    .onError('transform').deadLetter()
    // highlight-end
    .onError('entity').deadLetter()
    .deadLetters().to.doc().db('datahub').collection('dead_letters')
    // highlight-next-line
    .lineage().to.doc().db('datahub').collection('lineage')
    .save({ batchSize: 500 });
```

`.doc().db(...).collection(...)` writes every record passing by, in batches, and passes it on unchanged. Each copy is tagged with the pipeline, the run ID and its layer.

`.lineage()` records every run. The CRM and the practice sync pipelines get the same line. Two handlers in `DataExchangeService`, `pipelineRuns` and `lineage`, read the runs and lineage events from `datahub`.

**No YAML changes.**

## Run it again

```sh
yarn step:18
curl -X POST localhost:3000/data/imports/appointments -H 'Content-Type: text/csv' --data-binary @legacy.csv
curl -X POST localhost:3000/data/syncs/practice
```

The same four rows as in the last chapter now leave a trail through the layers:

| Layer | Records | |
|---|---|---|
| `bronze.legacy_appointments` | 4 | Every row, including `someday` and the missing phone number |
| `silver.appointments` | 3 | The `someday` row couldn't be cleaned. It's a dead letter from the `transform` stage |
| Gold entities | 2 customers, 2 appointments | The row without a phone is a dead letter from the `entity` stage |

When the cleanup changes, bronze still has the original rows to process again.

### Every run is recorded

```sh
curl -X POST localhost:3000/data/pipelineRuns
```

```json
[
  { "pipeline": "practice-sync", "status": "succeeded", "written": 2, "invalid": 0, "deadLettered": 0, … },
  { "pipeline": "appointment-import", "status": "succeeded", "written": 4, "invalid": 1, "deadLettered": 2, … }
]
```

### Where do customers come from?

```sh
curl -X POST localhost:3000/data/lineage -H 'Content-Type: application/json' -d '{"asset":"entity:Customer"}'
```

```json
[
  { "pipeline": "practice-sync", "from": ["sql:practice:practice-sync"], "written": 2, … },
  { "pipeline": "appointment-import", "from": ["http:post:/appointments"], "written": 4, … }
]
```

After the next CRM message, `crm-customers` with `mq:DEFAULT:queue:crm-customers` appears as well.

## What lineage records

The platform infers the **data assets** of a pipeline from its definition: triggers and sources on the way in, `doc` layers and entities on the way out. You don't declare them. Every run emits events:

| Event | Records |
|---|---|
| `trigger` | What started the run: an HTTP endpoint, a queue, a timer |
| `read` | The source assets |
| `transform` | Inputs, outputs and the steps in between: `csv`, `bronze`, `write:doc`, `map`, `silver`, `write:doc`, `gold`, `entities` |
| `write` | Inputs, outputs and the record counts |
| `fail` | The error and the counts so far, if the run failed |

With `.lineage().to.doc()`, runs are stored in `<collection>_runs` and events in `<collection>_events`. Without it, the events are still part of every run report.

## What you learned

- **Keep data at every stage.** Bronze makes imports repeatable, silver gives analysts clean data, gold is the model the application works with.
- **Lineage comes from the definition.** Because pipelines are declarations, the platform knows what they read and write, and can record it for every run.
- The app is now a small data hub: several sources, one model, and a record of how the data got there.

## Reviewer's view

> `appointment-import` keeps raw rows in `bronze.legacy_appointments` and cleaned rows in `silver.appointments` before creating entities. Rows failing cleanup or validation become dead letters. All three pipelines record their runs and lineage in `datahub`.

Two questions for the review: *how long should bronze keep raw data?* It contains personal data exactly as delivered. And *who may read `datahub`?*

## The catch

Every record in this part went live the moment it arrived. A row in gold is an appointment, and an appointment gets a reminder. The next source isn't one we should trust that much.

[Sample: step 18](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/18-medallion-lineage) · Next: [Flows](./flows.md)

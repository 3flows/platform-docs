---
title: 15. Pipelines
---

# 15. Pipelines

**Where we are:** `DataExchangeService` imports the old system's CSV with transformers, and exports appointments as CSV.

**What we want:** the next source is already waiting. The partner CRM wants to **publish customer updates to a queue**: `{ fullName, phone }`.

## The obvious way

Do what worked for the CSV: a queue route in `DataExchangeService` that maps the message and saves the customer.

```ts
route.mq().queue('crm-customers').do(async (message, trigger) => {
    const { fullName, phone } = message as { fullName: string; phone: string };
    await Customers.create({ name: fullName, phone });
});
```

## Where it breaks

It works, but put it next to the CSV import and read both. Each one wraps a source, maps records, validates them, saves them one by one, decides what to do with bad ones and reports what happened, slightly differently each time. The CSV handler takes the file wrapped in JSON (`{ "csv": "…" }`), so a 50 MB export is a 50 MB string. The queue route has no report at all. A third source would be a third variation, and a reviewer has to read every line of each to find the part that matters: *which fields map to what*.

What we want to write down is only *where the data comes from, what happens to it and where it goes.*

## The concept: pipelines

A pipeline is a service that declares its triggers, a source, steps and a sink. The platform runs it.

```ts title="pipelines.ts"
import { Pipeline, Register } from '@3flows/platform';
import { Customers } from './domain.js';
import { fromLegacyRow } from './legacy.js';

/** Upload of the old system's CSV export: POST /data/imports/appointments with Content-Type text/csv. */
@Register()
export class AppointmentImportPipeline extends Pipeline {
    define() {
        return this.pipeline('appointment-import')
            .on.http().post('/appointments')
            .from.trigger().stream()
            .parse.csv({ delimiter: ';' })
            .toEntities(fromLegacyRow)
            .onError('entity').skip()
            .save({ batchSize: 500 });
    }
}

/** The partner CRM publishes customer updates to the crm-customers queue: { fullName, phone }. */
@Register()
export class CrmCustomersPipeline extends Pipeline {
    define() {
        return this.pipeline('crm-customers')
            .on.mq().queue('crm-customers')
            .from.trigger().payload()
            .toEntity(Customers, { name: (customer) => customer.fullName }); // phone has the same name and is copied
    }
}
```

Read it top to bottom: *on* a trigger, *from* a source, through steps, *to* a sink. `fromLegacyRow` is the same mapping as in the last chapter. The import handler in `DataExchangeService` is gone. The export stays.

A pipeline is a service. `pipelines.register` starts it, and YAML exposes its triggers like the routes of any other service:

```yaml title="platform.yml"
services:
  - name: AppointmentsService
  - name: NotificationsService
  - name: DataExchangeService

# highlight-start
pipelines:
  register:
    - name: AppointmentImportPipeline
    - name: CrmCustomersPipeline
# highlight-end

https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService
      - name: DataExchangeService
        basepath: /data
      # highlight-start
      # A pipeline is a service: its HTTP trigger is exposed like any other route.
      - name: AppointmentImportPipeline
        basepath: /data/imports
      # highlight-end

mqs:
  - name: DEFAULT
    type: memory
    use:
      - NotificationsService
      # highlight-next-line
      - CrmCustomersPipeline
```

## Run it again

```sh
yarn step:15
curl -X POST localhost:3000/data/imports/appointments -H 'Content-Type: text/csv' --data-binary @legacy.csv
```

The file is uploaded as it is, and streamed through the pipeline. The response is the run report:

```json
{
  "runId": "d283181b-633a-4ad4-8189-75662b243602",
  "name": "appointment-import",
  "emitted": 4,
  "written": 4,
  "invalid": 1,
  "failed": 0,
  "deadLettered": 0,
  "errors": [],
  "lineage": [ … ]
}
```

A customer update from the CRM is a message on a queue:

```ts
await mq().queue('crm-customers').send({ fullName: 'Ada King, Countess of Lovelace', phone: '+15550000001' });
```

The phone number identifies Ada, so the pipeline updates her name. Her appointments stay attached, because her ID didn't change. That's the natural key from [chapter 11](./natural-keys.md) at work: **the import, the CRM, GraphQL and the booking API all agree on who Ada is, without knowing about each other.**

## Building blocks

| Part | Options |
|---|---|
| Triggers `.on` | `http().post(path)` (and `get`, `put`, `patch`, `delete`), `mq().queue(name)`, `mq().topic(name, pattern)`, `timer(cron)`, `manual()`. Several triggers are allowed |
| Source `.from` | `trigger().payload()`, `.body()`, `.stream()`, `.buffer()`, `.parameters()`, `.message()`, `.envelope()`, `array(records)`, `stream(readable)`, `sql(name).select(...)` |
| Parse | `parse.csv(options)` |
| Steps | `map(fn)`, `batch(size)`, `mapBatch(fn)`, `unbatch()`, `transform(transformer)`, `toEntity(entity, fields)`, `toEntities(targets)` |
| Sink | `save({ batchSize })` (the default) writes entities in bulk. `to.writable(stream)` hands records to any writable stream |
| Errors | `onError(stage).fail()` (the default), `.skip()`, `.deadLetter()` |

`.save()` groups entities per collection and writes them with one bulk operation per batch. A pipeline can also run without a trigger: `await pipeline.run({ input: rows })` runs it directly, which is handy in tests.

:::note
Pipelines are strict by default: an invalid record fails the whole run. Here, `onError('entity').skip()` keeps the behavior of the last chapter. The report says **that** a row was skipped, but no longer **which one**. [Chapter 17](./dead-letters.md) fixes that.
:::

## What you learned

- **A pipeline is a declaration:** trigger, source, steps, sink. The platform does the streaming, batching, error handling and reporting.
- **A pipeline is a service.** `pipelines.register` starts it. HTTP, queues and timers trigger it the same way they trigger any other route, and YAML decides where it's exposed.
- Transformers and mappings don't change when they move into a pipeline.

## Reviewer's view

> `appointment-import`: a CSV upload at `POST /data/imports/appointments` becomes customers and appointments through `fromLegacyRow`. Invalid rows are skipped. `crm-customers`: messages on the `crm-customers` queue update customers by phone number.

Each pipeline reads like its own summary. That's the point.

[Sample: step 15](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/15-pipelines) · Next: [Sync from a database](./sync-from-a-database.md)

# Transformers, pipelines and lineage

The platform has three layers for moving data. Each one builds on the one below.

| Layer | What it adds | Use it when |
|---|---|---|
| **Transformers** | Node.js streams that parse, map, validate and serialize records | You need one conversion inside your own code |
| **Pipelines** | Declared triggers, sources, steps, sinks and error policies, run by the platform | Data arrives or leaves regularly, from HTTP, queues, timers or databases |
| **Lineage** | Runs and data assets recorded for every pipeline run | You need to know where data comes from and what happened to it |

All three work with the [domain model](./domain-model.md). Records become validated entities, and **natural keys** make every write idempotent.

## Natural keys

```ts
ontology('AppointmentsOntology', (o) => {
    const Customer = o.entity('Customer', { name: o.string(), phone: o.string() }, { key: ['phone'] });
    o.entity('Appointment', { at: o.string(), customer: o.one(Customer) }, { key: ['customer', 'at'] });
});
```

The ID of a keyed entity is derived from its key. The same data always gets the same ID, in every process. Importing, syncing or receiving the same record twice updates the entity instead of duplicating it.

## Transformers

```ts
await pipeline(
    file,
    new CSVTransformer({ delimiter: ';' }),
    entityTransformer(Customers, { name: (row) => row.Name, phone: (row) => row.Mobile }),
    await Customers.asWritable()
);
```

| Transformer | From → to |
|---|---|
| `CSVTransformer` | bytes → rows |
| `SAXTransformer` | XML bytes → records (extend it) |
| `entityTransformer` / `entitiesTransformer` | records → validated entities, with `ref(...)` for relationships |
| `entityRecordTransformer` | entities → flat records, references resolved with `with` |
| `RecordCSVTransformer` | records → CSV bytes |
| `AbstractTransformer` | base class for your own |

## Pipelines

```ts
@Register()
export class CrmCustomersPipeline extends Pipeline {
    define() {
        return this.pipeline('crm-customers')
            .on.mq().queue('crm-customers')
            .from.trigger().payload()
            .toEntity(Customers, { name: (customer) => customer.fullName })
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters')
            .lineage().to.doc().db('datahub').collection('lineage');
    }
}
```

A pipeline is a [service](./services-and-routes.md). YAML exposes its HTTP triggers through `https`, attaches its queue triggers through `mqs.use`, and its timers start and stop with it.

| Part | Options |
|---|---|
| Triggers | `on.http()`, `on.mq().queue()` / `.topic()`, `on.timer(cron)`, `on.manual()` |
| Sources | `from.trigger()` (`payload`, `body`, `stream`, `buffer`, `parameters`, `message`, `envelope`), `from.array()`, `from.stream()`, `from.sql()` |
| Steps | `parse.csv()`, `map()`, `batch()`, `mapBatch()`, `unbatch()`, `transform()`, `toEntity()`, `toEntities()` |
| Layers | `bronze()`, `silver()`, `gold()`, and `doc().db().collection()` to keep a copy of every record |
| Sinks | `save({ batchSize })` (default, bulk writes), `to.writable()` |
| Errors | `onError('transform' \| 'entity')` with `fail()` (default), `skip()` or `deadLetter()` |
| Lineage | `lineage().to.doc().db().collection()` |

Every run returns a report: `read`, `emitted`, `written`, `invalid`, `failed`, `deadLettered`, `errors` and the lineage events.

## Lineage

Pipelines are declarations, so the platform can infer their **data assets**: HTTP endpoints, queues, timers and SQL sources on the way in, `doc` layers and entities on the way out. Every run emits `trigger`, `read`, `transform`, `write` and, on errors, `fail` events between those assets.

## Why this matters for review

A pipeline declaration is its own summary: where data comes from, how it's mapped, what happens to bad records and where it ends up. The mapping is the part that needs careful review. The streaming, batching, error handling and lineage are the platform's job, and the same in every pipeline.

Walk through it hands-on in the tutorial: [Natural keys](../tutorial/natural-keys.md), [Transformers](../tutorial/transformers.md), [Pipelines](../tutorial/pipelines.md), [Sync from a database](../tutorial/sync-from-a-database.md), [Dead letters](../tutorial/dead-letters.md), [Medallion layers and lineage](../tutorial/medallion-and-lineage.md).

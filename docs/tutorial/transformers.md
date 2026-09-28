---
title: 12. Transformers
---

# 12. Transformers

**Where we are:** the app from Part 2: an ontology with natural keys and a generated GraphQL API. Creating the same customer twice updates it. So far, every record was typed in by a person. Part 3 is about data that arrives from other systems.

**The problem:** the practice used an old booking system before. It can export its appointments as CSV, and those appointments should get reminders too:

```text title="legacy.csv"
Name;Mobile;Date;Notes
Ada Lovelace;+1 555 000 0001;2030-01-15 10:00;first visit
Grace Hopper;+1 555 000 0002;2030-01-16 09:30;
No Phone;;2030-01-17 11:00;
```

The columns don't match our model, phone numbers contain spaces, dates are in a different format, and some rows are broken. And the analytics team wants the opposite direction: *all appointments as a CSV file.*

## The solution: transformers

A transformer is a Node.js stream that turns one kind of record into another. The platform ships the ones a data hub needs:

| Transformer | From → to |
|---|---|
| `CSVTransformer` | bytes → rows (`Record<string, string>`) |
| `entityTransformer(entity, fields)` | rows → validated entities |
| `entitiesTransformer(targets)` | one row → several related entities |
| `entityRecordTransformer(entity)` | entities → flat records, references resolved |
| `RecordCSVTransformer` | records → CSV bytes |

### The mapping

The mapping says how a row of the old system becomes our entities. It's plain data, in its own file:

```ts title="legacy.ts"
import { EntityTarget, ref } from '@3flows/platform';
import { Appointments, Customers } from './domain.js';

/** A row of the old booking system's export: `Name;Mobile;Date;Notes`. */
export type LegacyRow = { Name: string; Mobile: string; Date: string; Notes?: string };

/** The old system writes phone numbers with spaces: `+1 555 000 0001`. */
const toPhone = (mobile: string) => mobile.replaceAll(' ', '');

/** The old system writes dates as `2030-01-15 10:00`, in UTC. Anything else is rejected. */
const toIsoDate = (date: string) => {
    const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/.exec(date);
    if (!match) throw new Error(`Date ${date} is not in the format YYYY-MM-DD HH:mm`);
    return `${match[1]}T${match[2]}:00.000Z`;
};

/** Every row becomes a customer and an appointment that references it. */
export const fromLegacyRow: EntityTarget<LegacyRow>[] = [
    {
        entity: Customers,
        fields: {
            name: (row) => row.Name,
            phone: (row) => toPhone(row.Mobile)
        }
    },
    {
        entity: Appointments,
        fields: {
            at: (row) => toIsoDate(row.Date),
            customer: ref(Customers) // the customer produced from the same row
        }
    }
];
```

`ref(Customers)` links the appointment to the customer created from the same row. To link to an existing customer by key instead, use `ref(Customers).by('phone', (row) => toPhone(row.Mobile))`. Because IDs are derived from keys, that needs no lookup.

### Import and export

A new `DataExchangeService` connects the transformers with Node's `pipeline`:

```ts title="exchange.ts"
/** Saves every entity it receives, whatever its type. */
const save = () =>
    new Writable({
        objectMode: true,
        write(entity: Entity<any, any>, _encoding, next) {
            entity.save().then(() => next(), next);
        }
    });

@Register()
export class DataExchangeService extends Service {
    handlers = () => [
        // CSV text → rows → customers and appointments → saved.
        handler('importAppointments', ImportAppointments, ImportReport, async ({ csv }, trigger) => {
            const toEntities = entitiesTransformer<LegacyRow>(fromLegacyRow);

            await pipeline(Readable.from([Buffer.from(csv)]), new CSVTransformer({ delimiter: ';' }), toEntities, save());

            await trigger.ok(toEntities.report);
        })
    ];

    routes(): Route {
        const route = super.routes();

        // Appointments → flat records with the customer resolved → CSV, streamed to the client.
        route.http().get('/exports/appointments.csv').do(async (_params, trigger) => {
            const csv = pipeline(
                Appointments.find({}).asReadable(),
                entityRecordTransformer(Appointments, { with: ['customer'] }),
                new RecordCSVTransformer({ delimiter: ';' }),
                (error) => error && trigger.context.log().stack(`Export failed: ${error.message}`).error()
            );
            trigger.setReadble(csv, { mimeType: 'text/csv' });
            await trigger.ok();
        });

        return route;
    }
}
```

```yaml title="platform.yml"
services:
  - name: AppointmentsService
  - name: NotificationsService
  # highlight-next-line
  - name: DataExchangeService

https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService
      # highlight-start
      # Every service on a server needs its own path, so the data endpoints live under /data.
      - name: DataExchangeService
        basepath: /data
      # highlight-end
```

## Run it

```sh
yarn step:12
curl -X POST localhost:3000/data/importAppointments -H 'Content-Type: application/json' \
  -d '{"csv":"Name;Mobile;Date;Notes\nAda Lovelace;+1 555 000 0001;2030-01-15 10:00;first visit\nGrace Hopper;+1 555 000 0002;2030-01-16 09:30;\nNo Phone;;2030-01-17 11:00;\n"}'
```

The transformer reports what happened:

```json
{
  "read": 3,
  "emitted": 4,
  "invalid": 1,
  "errors": [
    {
      "index": 3,
      "entity": "Customer",
      "source": { "Name": "No Phone", "Mobile": "", "Date": "2030-01-17 11:00", "Notes": "" },
      "error": "Key field phone of Customer is missing"
    }
  ],
  "unusedColumns": ["Notes"]
}
```

Three rows read, two customers and two appointments emitted, one row rejected. `unusedColumns` lists source columns the mapping never read. If the old system adds a column, you'll see it here.

```sh
curl localhost:3000/data/exports/appointments.csv
```

```text
_id;at;customer._id;customer.name;customer.phone
"b9c06107-…";"2030-01-16T09:30:00.000Z";"3d6085ae-…";"Grace Hopper";"+15550000002"
"cef8dc9e-…";"2030-01-15T10:00:00.000Z";"5a641596-…";"Ada Lovelace";"+15550000001"
```

Imported appointments are regular appointments. The reminder timer picks them up, GraphQL lists them. They get no confirmation SMS, because they weren't booked through the API.

## What the entity transformer does

| Feature | Behavior |
|---|---|
| Auto mapping | Source fields with the name of an entity field are copied. Disable with `{ autoMap: false }` |
| Coercion | Auto-mapped CSV strings become numbers and booleans (`yes`, `1`, `true`) where the schema says so. Empty strings become missing |
| Validation | Every entity is validated with its schema. The ID comes from the natural key |
| Several targets | One row, several entities, in order. If one is invalid, none is emitted |
| Invalid records | `onInvalid: 'skip'` (default), `'fail'` or `'dead-letter'` with a `deadLetter` callback or stream |
| Report | `read`, `emitted`, `invalid`, the first `errors` and `unusedColumns` |

Transformers are ordinary Node.js `Transform` streams. They work with files, HTTP bodies, blobs and anything else that streams, and you can write your own by extending `AbstractTransformer`.

## What you learned

- **Mapping is data.** The mapping from an external format to the model is one small, readable declaration.
- **Transformers stream.** Records flow through one at a time, so the file size doesn't matter.
- Natural keys make the import safe to repeat: the same file twice creates nothing new.

## Reviewer's view

> `legacy.ts` maps `Name`, `Mobile` and `Date` of the old system to a customer and an appointment. Phone numbers are normalized, dates must match `YYYY-MM-DD HH:mm`. Invalid rows are skipped and reported. The export streams all appointments with their customer as CSV.

The mapping is the part to review closely. Everything else is plumbing.

[Sample: step 12](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/12-transformers) · Next: [Pipelines](./pipelines.md)

---
title: 17. Sync from a database
---

# 17. Sync from a database

**Where we are:** pipelines import CSV uploads and CRM messages.

**The problem:** a partner practice refers patients to us. Their practice software keeps patients in a SQL database, and we are allowed to read one table:

| id | first_name | last_name | mobile | active |
|---|---|---|---|---|
| 1 | Dorothy | Vaughan | +15550000011 | true |
| 2 | Mary | Jackson | +15550000012 | true |
| 3 | Annie | Easley | +15550000013 | false |

Nobody uploads anything and nobody publishes a message. We have to **pull**: every night, and on demand when the practice calls.

## The solution: a SQL source and a timer trigger

```ts title="pipelines.ts"
/** A row of the partner practice's `patients` table. */
export type PatientRow = {
    id: number;
    first_name: string;
    last_name: string;
    mobile: string;
    active: boolean;
};

/** Every night, active patients of the partner practice become customers. On demand: POST /data/syncs/practice. */
@Register()
export class PracticeSyncPipeline extends Pipeline {
    define() {
        return this.pipeline('practice-sync')
            .on.timer('0 0 2 * * *') // every night at 02:00
            .on.http().post('/practice')
            .from.sql('practice').select<PatientRow>((sql) => sql.table<PatientRow>('patients').where({ active: true }))
            .toEntity(Customers, {
                name: (patient) => `${patient.first_name} ${patient.last_name}`,
                phone: (patient) => patient.mobile
            });
    }
}
```

`from.sql('practice')` uses the same fluent SQL API as `sql()` in any service. The rows are streamed, not loaded at once.

```yaml title="platform.yml"
services:
  # …
  # highlight-next-line
  - name: PracticeSyncPipeline

https:
  - name: api
    services:
      # …
      # highlight-start
      - name: PracticeSyncPipeline
        basepath: /data/syncs
      # highlight-end

# highlight-start
# The database of the partner practice. Read by the PracticeSyncPipeline.
sqls:
  - name: practice
    type: memory # or postgres, mariadb, sqlite
# highlight-end
```

In production, `type: postgres` with `parameters.connectionString` points at the real database. Same code. See the [SQL reference](../configuration/sqls.md).

The timer belongs to the pipeline: it starts with the pipeline and stops with it.

## Run it

The sample seeds the memory database with the three patients above (`seed.ts`).

```sh
npm run step:17
curl -X POST localhost:3000/data/syncs/practice
```

```json
{ "name": "practice-sync", "read": 2, "emitted": 2, "written": 2, "invalid": 0, "failed": 0, … }
```

Two active patients, two customers. Annie is inactive and isn't read at all.

Now Mary changes her last name in the practice software, and the sync runs again. There are still two customers, and Mary's name is updated. **A nightly sync of a full table is safe to repeat**, because the phone number identifies the customer. No change tracking, no "last synced" timestamp, no delete-and-reload.

## What you learned

- **Pull and push are the same pipeline.** Only the trigger and the source change. The mapping and the sink don't.
- `sqls` adds relational databases with the same fluent style as `docs`: memory for development, PostgreSQL, MariaDB or SQLite in production.
- Natural keys turn a full re-sync into an update.

## Reviewer's view

> Every night at 02:00, and on `POST /data/syncs/practice`, active patients of the `practice` database become customers, identified by their mobile number.

Worth checking: *is `mobile` in the partner's database in the same format as ours?* If not, normalize it in the mapping, as for the old system.

[Sample: step 17](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/17-sql-sync) · Next: [Dead letters](./dead-letters.md)

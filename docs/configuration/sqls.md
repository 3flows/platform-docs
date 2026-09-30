# `sqls`

The `sqls` section configures relational databases. Services use them through `sql(name)`, and pipelines read from them with `from.sql(name)`.

```yaml
sqls:
  - name: practice
    type: memory
```

```ts
const patients = await this.sql('practice').table('patients').where({ active: true }).all();
```

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | Name used by `sql(name)` and `from.sql(name)` |
| `type` | `memory` | `memory`, `postgres`, `mariadb` or `sqlite` |
| `parameters` | | Connection settings of the backend |

## PostgreSQL

```yaml
sqls:
  - name: practice
    type: postgres
    parameters:
      connectionString:
        $vault: { path: practice-database, key: connectionString }
      schema: public
      maxPoolSize: 20
```

Instead of `connectionString`, `host`, `port`, `database`, `user` and `password` can be given separately. `ssl` is passed to the driver. Take credentials from a [vault](./vaults.md), never from the YAML itself.

The `memory` backend needs no parameters and starts empty, which makes it a good fit for development and tests.

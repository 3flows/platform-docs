# `graphqls`

The `graphqls` section exposes GraphQL endpoints, generated from domains and entities, and from service handlers.

## On an existing HTTP server

```yaml
graphqls:
  - name: graphql
    useHttp: api
    path: /graphql
    domains:
      - Scheduling
```

## On its own port

```yaml
graphqls:
  - name: graphql
    port: 4000
    services:
      - name: AppointmentsService
```

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | Endpoint name |
| `useHttp` | | Attach to an existing `https` server. Don't combine with `port` |
| `port` | | Start a dedicated HTTP server |
| `basepath` / `path` | `''` / `/` | Location of the endpoint |
| `domains` | `[]` | Generate queries and mutations for all entities of these domains, with relationships in both directions |
| `entities` | `[]` | Generate for individual entities, with `typeName`, `operations` and `relationships` |
| `services` | `[]` | Expose service handlers as GraphQL fields |
| `playground` | `true` | GraphQL playground |
| `introspection` | `true` | Schema introspection |
| `subscriptions` | `false` | Subscriptions over WebSockets |
| `auth` | | Authentication with an identity provider |

## Generated operations per entity

| Kind | Example for `Customer` |
|---|---|
| Get | `customer(id, shardKey)` |
| Search | `customers(first, offset, sort, find, combine, match)` returns `{ totalCount, elements }` |
| Count | `countCustomers(find, combine, match)` |
| Create / update / delete | `addCustomer`, `updateCustomer`, `deleteCustomer` |
| Relationships | Related fields in both directions, and `assign…` / `clear…` mutations |

Restrict operations per entity with `entities[].operations`: `get`, `find`, `count`, `create`, `update`, `delete`.

Handler schemas must use GraphQL-representable shapes. Primitive Zod 4 string/number/boolean/object/array/enum schemas are supported, including current Zod 4 internal format definitions where they still represent strings. Unsupported custom schemas fall back to JSON or fail with `Unsupported Zod type` depending on the position.

See the tutorial chapter [GraphQL](../tutorial/graphql.md) for a runnable example.

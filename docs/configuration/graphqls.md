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

Handler schemas become GraphQL types: strings, numbers, booleans, enums, arrays and objects, including Zod 4 format types such as `t.iso.datetime()`, which become `String`. `t.any()` becomes a `JSON` scalar. Any other schema fails at startup with `Unsupported Zod type`.

A `.describe()` on a handler's output object becomes the description of its GraphQL type. Descriptions of individual fields, and the `.describe()` texts of a domain, aren't part of the GraphQL schema. They're published by [`ontologies`](./ontologies.md).

See the tutorial chapter [GraphQL](../tutorial/graphql.md) for a runnable example.

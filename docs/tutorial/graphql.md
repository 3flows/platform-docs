---
title: 12. GraphQL
---

# 12. GraphQL

**Where we are:** the domain is described by an ontology.

**The problem:** the front-end team is building a customer dashboard. They want *customers with their appointments*, *appointments with their customer*, sorting, filtering and paging. Writing a handler for each combination doesn't scale.

## The solution: generate GraphQL from the ontology

YAML only:

```diff title="platform.yml"
+# GraphQL on the same HTTP server, generated from the ontology.
+graphqls:
+  - name: graphql
+    useHttp: api
+    path: /graphql
+    ontologies:
+      - AppointmentsOntology
```

That's a complete GraphQL API, including the relationship in both directions:

```graphql
{
  customers(sort: [{ column: "name" }]) {
    totalCount
    elements {
      name
      phone
      appointments { totalCount elements { at } }
    }
  }
}
```

```graphql
{
  appointments(first: 10) {
    elements { at customer { name phone } }
  }
}
```

```graphql
mutation {
  addCustomer(input: { name: "Cleo", phone: "+15550000003" }) { _id name }
}
```

## What gets generated

For every entity, here `Customer`:

| Kind | Fields |
|---|---|
| Queries | `customer(id)`, `customers(first, offset, sort, find, combine, match)`, `countCustomers(...)` |
| Mutations | `addCustomer`, `updateCustomer`, `deleteCustomer` |
| Relationships | `Appointment.customer`, the inverse `Customer.appointments`, plus assign and clear mutations |
| Built-ins | `ping`, `health`, `metrics`, `openapiJson` |

Input validation uses the same entity schemas. Invalid mutations are rejected.

## Your own handlers in GraphQL

Service handlers can be added to the schema, too:

```yaml
graphqls:
  - name: graphql
    useHttp: api
    ontologies:
      - AppointmentsOntology
    services:
      - name: AppointmentsService
```

Each handler becomes a GraphQL field, with its arguments and result type inferred from its schemas. Handlers with an empty input object aren't supported yet. Use `t.void()` or at least one field.

GraphQL can also run on its own port (`port` instead of `useHttp`), with `playground`, `introspection` and `auth` options. See the [GraphQL reference](../configuration/graphqls.md).

## What you learned

- **One ontology, many views:** entities in code, an API in GraphQL, a description for tools and reviewers.
- The GraphQL schema is generated, so it can't drift from the model.

## Reviewer's view

> No code changes. A generated GraphQL endpoint at `/graphql` for the `AppointmentsOntology`.

The review question is about exposure, not implementation: *should these entities be readable and writable through GraphQL, and by whom?* That's where `auth` comes in.

[Sample: step 12](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/12-graphql) · Next: [Admin API](./admin-api.md)

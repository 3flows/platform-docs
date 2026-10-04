---
title: 10. GraphQL
---

# 10. GraphQL

**Where we are:** the model is one `Scheduling` domain.

**What we want:** the front-end team is building a customer dashboard. They want *customers with their appointments*, *appointments with their customer*, sorting, filtering and paging.

## The obvious way

A handler per screen:

```ts
handler('customersWithAppointments', t.object({ sort: t.string().optional(), first: t.number().optional() }), t.array(CustomerWithAppointments), …),
handler('appointmentsWithCustomer', …),
handler('customerByPhone', …),
```

Each is a few lines, and the first screen ships.

## Where it breaks

The second screen wants the same customers without appointments, the third wants them filtered by name, and the mobile app wants only the next appointment. Every combination is a new handler, a new output schema and a new review, and the handlers slowly drift from the model they're supposed to show. The model already knows everything these handlers encode: which entities exist, their fields, and how they're related.

## The concept: GraphQL generated from the domain

YAML only:

```yaml title="platform.yml"
# GraphQL on the same HTTP server: generated from the domain, plus the service handlers.
graphqls:
  - name: graphql
    useHttp: api
    path: /graphql
    domains:
      - Scheduling
    services:
      - name: AppointmentsService
```

## Run it

```sh
yarn step:10
```

That's a complete GraphQL API at `http://localhost:3000/graphql`, including the relationship in both directions:

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

`services` adds the handlers of `AppointmentsService` to the same schema. Each handler becomes a GraphQL field, with arguments and result type inferred from its schemas:

```graphql
{
  listAppointments { id name phone at }
}
```

Handlers without parameters, like `listAppointments`, become fields without arguments. Inputs with fields are passed as a single `parameter` argument.

GraphQL can also run on its own port (`port` instead of `useHttp`), with `playground`, `introspection` and `auth` options. See the [GraphQL reference](../configuration/graphqls.md).

## What you learned

- **One domain, many views:** entities in code, an API in GraphQL, and soon a description for people and agents.
- The GraphQL schema is generated, so it can't drift from the model. New screens need queries, not handlers.

## Reviewer's view

> No code changes. A generated GraphQL endpoint at `/graphql` for the `Scheduling` domain and the handlers of `AppointmentsService`.

The review question is about exposure, not implementation: *should these entities be readable and writable through GraphQL, and by whom?* That's where `auth` comes in.

## The catch

Ada booked through the API. Now the front-end team builds a "new customer" form on top of the generated mutation, and reception adds Ada again, with her full name:

```graphql
mutation {
  addCustomer(input: { name: "Ada Lovelace", phone: "+15550000001" }) { _id }
}
```

```graphql
{ customers { totalCount elements { name phone appointments { totalCount } } } }
```

```json
{
  "totalCount": 2,
  "elements": [
    { "name": "Ada", "phone": "+15550000001", "appointments": { "totalCount": 1 } },
    { "name": "Ada Lovelace", "phone": "+15550000001", "appointments": { "totalCount": 0 } }
  ]
}
```

**Two Adas, one phone number.** The second one has no appointments, and the next booking might attach to either. The rule *"one customer per phone number"* lives in `findOrCreateCustomer`, inside one handler. The generated mutation has never heard of it.

[Sample: step 10](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/10-graphql) · Next: [Natural keys](./natural-keys.md)

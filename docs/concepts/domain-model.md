# Entities, ontologies and GraphQL

The platform has three layers for business data. Each one builds on the one below.

| Layer | What it adds | Use it when |
|---|---|---|
| **`docs`** | Store and query JSON documents | You need storage and nothing more |
| **Entities** | Schema validation, identity, timestamps, references, retries | Your data has a shape and relationships |
| **Ontology** | The domain model as data: entities, fields and explicit relationships with inverses | You want one described model for code, APIs, tools and reviewers |

On top of an ontology, the platform **generates**:

- a GraphQL API with queries, search, counts, mutations and relationship fields
- descriptions through the [admin API](../configuration/admins.md)

## Entities

```ts
export const Customers = entity('Customer', Entity.base.extend({ name: t.string(), phone: t.string() }));
export const Appointments = entity('Appointment', Entity.base.extend({ at: t.string(), customer: reference('Customer') }));

const customer = await Customers.create({ name: 'Ada', phone: '+15550000001' });
await Appointments.create({ at: '2030-01-01T10:00:00Z', customer: customer.reference() });
```

## Ontology

```ts
ontology('AppointmentsOntology', (o) => {
    const Customer = o.entity('Customer', { name: o.string(), phone: o.string() });
    o.entity('Appointment', { at: o.string(), customer: o.one(Customer).inverse('appointments') });
});
```

Large domains can be composed from modules with `ontologyEntity`, `ontologyModule` and `ontology.use(...)`.

## Why this matters for review

An ontology is the shortest accurate description of a domain. A reviewer can read it in a minute. Generated APIs follow from it, so reviewing the model *is* reviewing the API surface.

Walk through it hands-on in the tutorial: [Entities](../tutorial/entities.md), [Ontology](../tutorial/ontology.md), [GraphQL](../tutorial/graphql.md).

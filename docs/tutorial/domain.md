---
title: 9. One domain
---

# 9. One domain

**Where we are:** `Customer` and `Appointment` are entities. `Appointment` references its customer with `reference('Customer')`.

**What we want:** the model of our business in one place, so that code, GraphQL, tools, agents and reviewers can all read the same thing.

## The obvious way

That's what we have: one `entity(...)` call per entity, in `domain.ts`. As the business grows, more of them appear, some in other files, each with references to others by name.

## Where it breaks

Misspell the reference in `domain.ts`:

```ts title="domain.ts"
customer: reference('Custmer')
```

```sh
yarn step:08
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

It compiles. It starts. Booking works, and listing works. Every appointment in the store now points to an entity called `Custmer`, which doesn't exist, and nothing notices until something follows the reference by its name: a generated API, an export, an agent. A string is not a relationship.

And there are questions the code can't answer without someone reading it:

- *Which entities make up our business?* There's no list, only `entity()` calls wherever they are.
- *What are Ada's appointments?* The relationship only goes one way. The other way is a query someone has to know to write.
- *Which relationships exist at all?*

## The concept: a domain

A domain declares the entities of one part of the business, their fields and their relationships, in one block. Relationships point to entities, not to strings, and the domain returns typed entities:

```ts title="domain.ts"
import { domain } from '@3flows/platform';

/** The scheduling domain: who our customers are, and when they come. */
export const Scheduling = domain('Scheduling', (d) => {
    const Customer = d.entity('Customer', {
        name: d.string(),
        phone: d.string()
    });

    const Appointment = d.entity('Appointment', {
        at: d.string(),
        // highlight-next-line
        customer: d.one(Customer).inverse('appointments')
    });

    return { Customer, Appointment };
});

export const Customers = Scheduling.Customer;
export const Appointments = Scheduling.Appointment;
```

`d.one(Customer).inverse('appointments')` says: *an appointment has one customer, and a customer has many appointments.* Misspell `Customer` there and TypeScript stops you: `Cannot find name 'Custmer'`.

**`appointments.ts` doesn't change at all.** `Customers` and `Appointments` are the same kind of entity as before, now typed from the domain: `Customers.create({ name })` without a phone doesn't compile. In YAML, `domains` replaces the list of entities:

```yaml title="platform.yml"
# highlight-next-line
# Entities come from the domain and are stored in the DEFAULT docs store.
entities:
  backend: docs
  db: appointments
  # highlight-start
  domains:
    - Scheduling
  # highlight-end
```

## Run it again

```sh
yarn step:09
```

The app behaves exactly as before. What's new is that the model can describe itself:

```ts
Scheduling.describe();
```

```json
{
  "name": "Scheduling",
  "entities": [
    { "name": "Customer", "fields": [{ "name": "name", "type": "string", "required": true }, { "name": "phone", … }] },
    { "name": "Appointment", "fields": [{ "name": "at", … }, { "name": "customer", "type": "relationship", … }] }
  ],
  "relationships": [
    { "source": "Appointment", "name": "customer", "entity": "Customer", "cardinality": "one", "inverse": "appointments" }
  ]
}
```

The next chapters build on exactly this description: GraphQL is generated from it, and the ontology and the MCP server project it for people and agents.

## Domain building blocks

| Building block | Example |
|---|---|
| Fields | `d.string()`, `d.number()`, `d.int()`, `d.boolean()`, `d.enum(['FREE', 'PRO'])` |
| Modifiers | `.optional()`, `.nullable()`, `.default('FREE')` |
| Relationships | `d.one(Customer)`, `d.many(Tag)`, `.inverse('appointments')`, `.label('books')` |
| Meaning | `.describe(text)`, `.alias(name)`, `.example(value)` on fields, relationships and entities. See [chapter 12](./ontology.md) |
| Options | `d.entity(name, fields, { typeName, collection, db, key })`. `key` is covered in [chapter 11](./natural-keys.md) |
| Types | `EntityOutput<typeof Scheduling.Customer>`, `EntityInput<…>`, `EntityType<…>` |
| Composition | `domainEntity(...)`, `domainModule(...)` and `d.use(...)` to split a big domain into modules |

## What you learned

- **A domain is the model of the business, in one place.** Entities, fields and relationships are explicit, typed and machine-readable.
- Relationships point to entities, so mistakes are compile errors, not data.
- Switching from separate entities to a domain changed only `domain.ts` and YAML.

## Reviewer's view

> The scheduling domain: two entities, one relationship with its inverse.

This is the page a reviewer reads first.

[Sample: step 09](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/09-domain) · Next: [GraphQL](./graphql.md)

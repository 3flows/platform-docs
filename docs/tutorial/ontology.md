---
title: 11. Ontology
---

# 11. Ontology

**Where we are:** `Customer` and `Appointment` are entities. `Appointment` references its customer.

**The problem:** the relationship is only implicit, a `reference('Customer')` field. Nobody can ask the model *"which relationships exist?"* or *"what are the appointments of a customer?"* And as the domain grows, entity definitions get scattered across files. We want the domain described **once, explicitly**, so the platform, tools, agents and reviewers can all read it.

## The solution: an ontology

An ontology describes entities, their fields and their relationships in one place.

```ts title="domain.ts"
import { ENTITIES, ontology } from '@3flows/platform';

/** The appointments domain: entities, fields and relationships in one place. */
export const AppointmentsOntology = ontology('AppointmentsOntology', (o) => {
    const Customer = o.entity('Customer', {
        name: o.string(),
        phone: o.string()
    });

    o.entity('Appointment', {
        at: o.string(),
        customer: o.one(Customer).inverse('appointments')
    });
});

export const Customers = ENTITIES['Customer'];
export const Appointments = ENTITIES['Appointment'];
```

`o.one(Customer).inverse('appointments')` says: *an appointment has one customer, and a customer has many appointments.*

**`appointments.ts` doesn't change at all.** The ontology registers the same entities.

```diff title="platform.yml"
-# Entities are stored in the DEFAULT docs store.
+# Entities come from the ontology and are stored in the DEFAULT docs store.
 entities:
   backend: docs
   db: appointments
-  entity:
-    - name: Customer
-    - name: Appointment
+  ontologies:
+    - AppointmentsOntology
```

## Describe it

```ts
AppointmentsOntology.describe();
```

```json
{
  "name": "AppointmentsOntology",
  "entities": [{ "name": "Customer" }, { "name": "Appointment" }],
  "relationships": [
    { "source": "Appointment", "name": "customer", "entity": "Customer", "cardinality": "one", "inverse": "appointments" }
  ]
}
```

## Ontology building blocks

| Building block | Example |
|---|---|
| Fields | `o.string()`, `o.number()`, `o.int()`, `o.boolean()`, `o.enum(['FREE', 'PRO'])` |
| Modifiers | `.optional()`, `.default('FREE')` |
| Relationships | `o.one(Customer)`, `o.many(Tag)`, `.inverse('appointments')` |
| Options | `o.entity('Customer', fields, { typeName, collection, db, key })`. `key` is covered in [chapter 14](./natural-keys.md) |
| Composition | `ontologyEntity(...)`, `ontologyModule(...)` and `ontology.use(...)` to split big domains into modules |

## What you learned

- **An ontology is the domain model as data.** Entities and relationships become explicit and machine-readable.
- Switching from entities to an ontology changed only `domain.ts` and YAML.

## Reviewer's view

> The domain model in eight lines: two entities, one relationship with its inverse.

This is the page a reviewer reads first.

[Sample: step 11](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/11-ontology) · Next: [GraphQL](./graphql.md)

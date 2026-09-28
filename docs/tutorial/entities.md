---
title: 8. Entities
---

# 8. Entities

**Where we are:** the app from Part 1. `AppointmentsService` and `NotificationsService` run in one process, and appointments are raw documents in `docs`: `{ id, name, phone, at }`. Part 2 gives this data a shape.

**The problem:** raw documents get us surprisingly far, but the domain is starting to show:

- Ada books twice, and her name and phone number are now stored twice. **Customers are a thing of their own.**
- Nothing validates what's written to the store.
- There are no creation or update timestamps.
- Nothing connects an appointment to its customer.

## The solution: entities

An entity is a schema plus persistence: validated data with an ID, `created` and `updated` timestamps, and references to other entities.

```ts title="domain.ts"
import { Entity, entity, reference, t } from '@3flows/platform';

export const Customers = entity(
    'Customer',
    Entity.base.extend({
        name: t.string(),
        phone: t.string()
    })
);

export const Appointments = entity(
    'Appointment',
    Entity.base.extend({
        at: t.string(),
        customer: reference('Customer')
    })
);
```

`Entity.base` adds `_id`, `shardKey`, `created` and `updated`.

Booking now recognizes returning customers and stores a reference:

```ts title="appointments.ts"
/** One customer per phone number: returning customers are recognized. */
async function findOrCreateCustomer(name: string, phone: string) {
    const existing = await Customers.find({ phone }).limit(1).next();
    return existing ?? (await Customers.create({ name, phone }));
}

/** The API shape of an appointment: the entity plus its customer. */
async function toAppointment(appointment: InstanceType<typeof Appointments>): Promise<Appointment> {
    const customer = await Customers.resolve(appointment.data.customer);
    return {
        id: appointment.data._id,
        at: appointment.data.at,
        name: customer?.data.name ?? 'unknown',
        phone: customer?.data.phone ?? 'unknown'
    };
}

handler('bookAppointment', BookAppointment, Appointment, async ({ name, phone, at }, trigger) => {
    const customer = await findOrCreateCustomer(name, phone);
    const appointment = await toAppointment(await Appointments.create({ at, customer: customer.reference() }));

    await trigger.context.service('NotificationsService').method('appointmentBooked').input(appointment).call();
    await trigger.ok(appointment);
}),
```

The public API, meaning the handler schemas, stays the same. `NotificationsService` is untouched.

```yaml title="platform.yml"
docs:
  - name: DEFAULT
    type: memory
# highlight-start

# Entities are stored in the DEFAULT docs store.
entities:
  backend: docs
  db: appointments
  entity:
    - name: Customer
    - name: Appointment
# highlight-end
```

## The entity API

| Operation | Code |
|---|---|
| Create | `await Customers.create({ name, phone })` |
| Find by ID | `await Customers.findById(id)` |
| Query | `await Customers.find({ phone }).sort({ name: 1 }).limit(10).all()` |
| Count | `await Customers.find({}).count()` |
| Update | `customer.data.name = 'Ada L.'; await customer.save()` |
| Delete | `await customer.delete()` |
| Reference | `customer.reference()` and `await Customers.resolve(reference)` |
| Inverse lookup | `Appointments.references(customer, 'customer')` |

Entities validate on every `create` and `save`. Invalid data never reaches the store.

## What you learned

- **Entities give documents a shape:** schema, identity, timestamps and relationships.
- They're stored through `docs`, so MongoDB or PostgreSQL work by changing YAML.

## Reviewer's view

> Two entities with a reference from `Appointment` to `Customer`. Booking finds or creates the customer by phone number. The API contract is unchanged.

[Sample: step 08](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/08-entities) · Next: [Ontology](./ontology.md)

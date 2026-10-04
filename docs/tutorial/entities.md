---
title: 8. Entities
---

# 8. Entities

**Where we are:** the app from Part 1. `AppointmentsService` and `NotificationsService` run in one process, and appointments are raw documents in `docs`: `{ id, name, phone, at }`. Part 2 gives this data a shape.

**What we want:** customers as a thing of their own. Ada books every month; she should be one customer with many appointments.

## The obvious way

Keep doing what works: every appointment document carries the customer's name and phone number. To find Ada's appointments, filter by phone.

```ts
const adas = await doc().collection('appointments').find({ phone: '+15550000001' }).all();
```

## Where it breaks

Book Ada twice and look at what's stored:

```sh
yarn step:07
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","phone":"+15550000001","at":"2030-02-01T10:00:00Z"}'
curl -X POST localhost:3000/listAppointments
```

Two documents, two names for the same person. Which one is right? When Ada changes her number, every one of her appointments has to be found and rewritten. And `docs` stores whatever it's given: a bug that writes `{ nme: 'Ada' }` is stored just as happily. There are no creation or update timestamps either.

The domain is showing: **a customer is not a field of an appointment.**

## The concept: entities

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

The public API, meaning the handler contracts, stays the same. `NotificationsService` is untouched.

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

## Run it again

```sh
yarn step:08
# book Ada twice, as above
```

There's one customer with two appointments. An invalid customer is refused before it reaches the store:

```ts
await Customers.create({ name: 'No phone' } as any); // throws: phone is required
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

[Sample: step 08](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/08-entities) · Next: [One domain](./domain.md)

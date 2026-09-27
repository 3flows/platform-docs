---
title: 14. Natural keys
---

# 14. Natural keys

**Where we are:** the app from [chapter 13](./admin-api.md): entities described by an ontology, a generated GraphQL API and an admin API. Part 3 of the tutorial continues from there.

**The problem:** customers and appointments are about to arrive from more than one place: the booking API, the old booking system, a partner CRM and a partner practice. Today, identity is a random ID created on first save. Recognizing a returning customer takes a lookup before every write:

```ts
const existing = await Customers.find({ phone }).limit(1).next();
return existing ?? (await Customers.create({ name, phone }));
```

That works for one handler. It doesn't work for a file with 10,000 rows, two imports running at the same time, or a sync that runs every night. Each of them would need the same lookup, and would create duplicates if it didn't have it.

## The solution: natural keys in the ontology

Say in the model **what identifies an entity**. The ID is then derived from the data:

```ts title="domain.ts"
export const AppointmentsOntology = ontology('AppointmentsOntology', (o) => {
    // The phone number identifies a customer, wherever the data comes from.
    const Customer = o.entity(
        'Customer',
        {
            name: o.string(),
            phone: o.string()
        },
        // highlight-next-line
        { key: ['phone'] }
    );

    // A customer has at most one appointment at a given time.
    o.entity(
        'Appointment',
        {
            at: o.string(),
            customer: o.one(Customer).inverse('appointments')
        },
        // highlight-next-line
        { key: ['customer', 'at'] }
    );
});
```

Same phone, same ID. `Customers.create(...)` with a known phone number updates the customer instead of adding a second one. Booking no longer needs the lookup, and the `findOrCreateCustomer` helper is gone:

```ts title="appointments.ts"
handler('bookAppointment', BookAppointment, Appointment, async ({ name, phone, at }, trigger) => {
    // highlight-start
    // The phone number identifies the customer: same phone, same customer. No lookup needed.
    const customer = await Customers.create({ name, phone });

    // Customer and time identify the appointment, so booking twice returns the same appointment.
    const id = Appointments.identify({ customer: customer.reference(), at })!;
    const existing = await Appointments.findById(id);
    if (existing) return trigger.ok(await toAppointment(existing));
    // highlight-end

    const appointment = await toAppointment(await Appointments.create({ at, customer: customer.reference() }));
    await trigger.context.service('NotificationsService').method('appointmentBooked').input(appointment).call();
    await trigger.ok(appointment);
}),
```

`Appointments.identify(...)` computes the ID an appointment *would* have, without touching the store. A double-clicked booking now returns the existing appointment and sends no second confirmation.

**No YAML changes.** The key is part of the model.

## How the ID is derived

| | |
|---|---|
| Declaration | `o.entity(name, fields, { key: ['phone'] })`. Key fields must be fields of the entity |
| Derivation | A UUID v5 of the entity name and the key values. Stable across processes, restarts and machines |
| References as keys | A reference contributes the ID of the referenced entity: `['customer', 'at']` |
| Explicit IDs | An `_id` or `id` in the data still wins |
| Missing key values | Rejected: `Key field phone of Customer is missing` |
| Description | `AppointmentsOntology.describe()` and `GET /admin/api/entities` show the `key` |

:::caution
The key is compared as data. `+1 555 000 0001` and `+15550000001` are different keys. Normalize key fields before they reach the entity. That's exactly what the mapping in the next chapter does.
:::

## Run it

```sh
npm run step:14
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-15T10:00:00.000Z"}'
# the same request again returns the same id, and no second SMS is sent
```

## What you learned

- **Identity belongs to the model.** A natural key says what makes two records the same thing.
- Derived IDs make writes idempotent: create twice, get one entity. This is what makes imports and syncs safe to repeat.

## Reviewer's view

> A customer is identified by its phone number, an appointment by customer and time. Creating a known customer updates it: the latest data wins. Booking the same slot twice returns the existing appointment.

The review question is about the model, not the code: *is the phone number really what identifies a customer?* If two customers can share a phone, the key is wrong.

[Sample: step 14](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/14-natural-keys) · Next: [Transformers](./transformers.md)

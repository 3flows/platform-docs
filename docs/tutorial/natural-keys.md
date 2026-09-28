---
title: 11. Natural keys
---

# 11. Natural keys

**Where we are:** entities described by an ontology, and a generated GraphQL API.

**The problem:** at the end of the last chapter, GraphQL created a second Ada. Recognizing a returning customer is a lookup in one handler:

```ts
const existing = await Customers.find({ phone }).limit(1).next();
return existing ?? (await Customers.create({ name, phone }));
```

Every other way to write a customer bypasses it: the generated `addCustomer` mutation, a script, and, in the next part, a CSV import with 10,000 rows, a nightly sync and a partner CRM. Each of them would need the same lookup, and would create duplicates if it didn't have it. Even with the lookup, two requests at the same moment both find nothing and both create.

Booking has the same problem one level down: a double-clicked *Book* button books the same slot twice, and sends two confirmations.

The rule *"one customer per phone number"* belongs to the model, not to a handler.

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

**No YAML changes.** The key is part of the model, so GraphQL uses it too. The mutation from the last chapter now updates Ada instead of adding a second one:

```json
{
  "totalCount": 1,
  "elements": [
    { "name": "Ada Lovelace", "phone": "+15550000001", "appointments": { "totalCount": 1 } }
  ]
}
```

Her appointment stays attached, because her ID didn't change.

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
The key is compared as data. `+1 555 000 0001` and `+15550000001` are different keys. Normalize key fields before they reach the entity. That's exactly what the mapping in [chapter 12](./transformers.md) does.
:::

## Run it

```sh
yarn step:11
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-15T10:00:00.000Z"}'
# the same request again returns the same id, and no second SMS is sent
```

## What you learned

- **Identity belongs to the model.** A natural key says what makes two records the same thing.
- Derived IDs make writes idempotent: create twice, get one entity. Handlers, GraphQL and every future import agree on who Ada is, without a lookup and without knowing about each other.

## Reviewer's view

> A customer is identified by its phone number, an appointment by customer and time. Creating a known customer updates it, wherever it's created: the latest data wins. Booking the same slot twice returns the existing appointment.

The review question is about the model, not the code: *is the phone number really what identifies a customer?* If two customers can share a phone, the key is wrong.

[Sample: step 11](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/11-natural-keys) · Next: [Part 3: Transformers](./transformers.md)

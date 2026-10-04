---
title: 11. Natural keys
---

# 11. Natural keys

**Where we are:** a `Scheduling` domain and a generated GraphQL API.

**What we want:** one customer per phone number, wherever the customer comes from.

## The obvious way

We already have it. Booking looks the customer up before creating one:

```ts
const existing = await Customers.find({ phone }).limit(1).next();
return existing ?? (await Customers.create({ name, phone }));
```

## Where it breaks

Ada booked through the API. Now reception adds her through the "new customer" form the front-end team built on the generated mutation, with her full name:

```sh
yarn step:10
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-15T10:00:00.000Z"}'
curl -X POST localhost:3000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"mutation { addCustomer(input: { name: \"Ada Lovelace\", phone: \"+15550000001\" }) { _id } }"}'
curl -X POST localhost:3000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ customers { totalCount elements { name phone appointments { totalCount } } } }"}'
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

**Two Adas, one phone number.** The rule *"one customer per phone number"* lives in one handler, and the generated mutation has never heard of it. Every other way to write a customer bypasses it too: a script, and, in Part 3, a CSV import with 10,000 rows, a nightly sync and a partner CRM. Each would need the same lookup. Even with it, two requests at the same moment both find nothing and both create.

Booking has the same problem one level down: a double-clicked *Book* button books the same slot twice and sends two confirmations.

The rule belongs to the model, not to a handler.

## The concept: natural keys

Say in the model **what identifies an entity**. The ID is then derived from the data:

```ts title="domain.ts"
export const Scheduling = domain('Scheduling', (d) => {
    // The phone number identifies a customer, wherever the data comes from.
    const Customer = d.entity(
        'Customer',
        {
            name: d.string(),
            phone: d.string()
        },
        // highlight-next-line
        { key: ['phone'] }
    );

    // A customer has at most one appointment at a given time.
    const Appointment = d.entity(
        'Appointment',
        {
            at: d.string(),
            customer: d.one(Customer).inverse('appointments')
        },
        // highlight-next-line
        { key: ['customer', 'at'] }
    );

    return { Customer, Appointment };
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

## Run it again

**No YAML changes.** The key is part of the model, so GraphQL uses it too. Run the same three commands against `yarn step:11`. The mutation now updates Ada instead of adding a second one:

```json
{
  "totalCount": 1,
  "elements": [
    { "name": "Ada Lovelace", "phone": "+15550000001", "appointments": { "totalCount": 1 } }
  ]
}
```

Her appointment stays attached, because her ID didn't change.

And the double click:

```sh
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-15T10:00:00.000Z"}'
# the same request again returns the same id, and no second SMS is sent
```

## How the ID is derived

| | |
|---|---|
| Declaration | `d.entity(name, fields, { key: ['phone'] })`. Key fields must be fields of the entity |
| Derivation | A UUID v5 of the entity name and the key values. Stable across processes, restarts and machines |
| References as keys | A reference contributes the ID of the referenced entity: `['customer', 'at']` |
| Explicit IDs | An `_id` or `id` in the data still wins |
| Missing key values | Rejected: `Key field phone of Customer is missing` |
| Description | `Scheduling.describe()` and `GET /admin/api/entities` show the `key` |

:::caution
The key is compared as data. `+1 555 000 0001` and `+15550000001` are different keys. Normalize key fields before they reach the entity. That's exactly what the mapping in [chapter 14](./transformers.md) does.
:::

## What you learned

- **Identity belongs to the model.** A natural key says what makes two records the same thing.
- Derived IDs make writes idempotent: create twice, get one entity. Handlers, GraphQL and every future import agree on who Ada is, without a lookup and without knowing about each other.

## Reviewer's view

> A customer is identified by its phone number, an appointment by customer and time. Creating a known customer updates it, wherever it's created: the latest data wins. Booking the same slot twice returns the existing appointment.

The review question is about the model, not the code: *is the phone number really what identifies a customer?* If two customers can share a phone, the key is wrong.

[Sample: step 11](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/11-natural-keys) · Next: [Ontology](./ontology.md)

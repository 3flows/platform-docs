---
title: 12. Ontology
---

# 12. Ontology

**Where we are:** a `Scheduling` domain with natural keys, and a generated GraphQL API.

**What we want:** people who didn't write the code should understand the model. A new colleague, the data team that wants our customers in its catalog, and, in the [next chapter](./mcp.md), an AI assistant.

## The obvious way

The model is already self-describing, isn't it? GraphQL has introspection, and there's `/openapi.json`. Point people at those.

## Where it breaks

Ask GraphQL what a customer's phone number is:

```sh
yarn step:11
curl -X POST localhost:3000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ __type(name: \"Customer\") { description fields { name description } } }"}'
```

```json
{ "description": null, "fields": [ …, { "name": "phone", "description": null }, … ] }
```

The schema has **types without meaning**. `phone: String!`, but in which format? With spaces? `at: String!`, but local time or UTC? Is a customer the same as what reception calls a *patient*? Which field identifies a customer? Can I delete one, and what happens to the appointments? The answers live in people's heads, in a wiki page that's already out of date, and in the natural keys of [chapter 11](./natural-keys.md), which no schema shows. An agent reading this schema will guess, and it will guess confidently.

## The concept: an ontology

Say what the concepts mean **where they're defined**, in the domain. Then publish the domain as an **ontology**: a description of the concepts, their meaning and their relationships that people, catalogs and agents can read.

First, the meaning. `describe`, `alias` and `example` work on fields, relationships and entities:

```ts title="domain.ts"
export const Scheduling = domain('Scheduling', (d) => {
    // The phone number identifies a customer, wherever the data comes from.
    const Customer = d
        .entity(
            'Customer',
            {
                // highlight-start
                name: d.string().describe('Full name, as the customer gave it').example('Ada Lovelace'),
                phone: d
                    .string()
                    .describe('Mobile number in E.164 format, without spaces. Reminders are sent to it')
                    .alias('mobile')
                    .example('+15550000001')
                // highlight-end
            },
            { key: ['phone'] }
        )
        // highlight-start
        .describe('A person who books appointments with the practice. One customer per mobile number.')
        .alias('patient');
        // highlight-end

    // A customer has at most one appointment at a given time.
    const Appointment = d
        .entity(
            'Appointment',
            {
                at: d
                    .string()
                    // highlight-start
                    .describe('Start of the appointment, ISO 8601 in UTC. A reminder is sent in the 24 hours before')
                    .example('2030-01-15T10:00:00.000Z'),
                    // highlight-end
                customer: d.one(Customer).inverse('appointments').describe('The customer who comes to the appointment')
            },
            { key: ['customer', 'at'] }
        )
        // highlight-start
        .describe('A booked time slot for one customer. Booking the same slot twice returns the same appointment.')
        .alias('booking');
        // highlight-end

    return { Customer, Appointment };
});
```

Then, the projection. YAML only:

```yaml title="platform.yml"
# The domain, projected as an ontology: what the concepts mean, for people, catalogs and agents.
ontologies:
  - name: scheduling
    useHttp: api
    path: /ontology
    namespace: https://reminders.example.com/ontology/scheduling#
    domains:
      - Scheduling
```

The `namespace` gives every concept a stable identifier (an IRI), such as `https://reminders.example.com/ontology/scheduling#Customer`, so other systems can refer to exactly this concept.

## Run it again

```sh
yarn step:12
curl 'localhost:3000/ontology/card.md?concept=Customer'
```

```md
# Customer

Kind: entity
Domain: Scheduling

Description: A person who books appointments with the practice. One customer per mobile number.

Aliases: patient

Identifiers:
- _id

Fields:
- name: string, required — Full name, as the customer gave it
- phone: string, required — Mobile number in E.164 format, without spaces. Reminders are sent to it

Relationships:
- appointments: many Appointment, inverse of Appointment.customer

Incoming relationships:
- Appointment.customer: one Customer

Capabilities:
- getCustomer: read, safe
- findCustomers: search, safe
- createCustomer: create, side effects, requires confirmation
- updateCustomer: update, side effects, requires confirmation
- deleteCustomer: delete, side effects, requires confirmation
```

That's a page a new colleague can read. It's generated from the code, so it can't go out of date. The **capabilities** say what can be done with a concept, and which of those operations change data and should be confirmed by a person before an agent does them.

The same ontology, in the formats the data team's catalog speaks:

```sh
curl localhost:3000/ontology.ttl       # Turtle (RDF/OWL)
curl localhost:3000/ontology.jsonld    # JSON-LD
curl localhost:3000/ontology.nt        # N-Triples
curl localhost:3000/ontology           # plain JSON
```

```turtle
ontology:Customer a owl:Class .
ontology:Customer rdfs:label "Customer" .
ontology:Customer.phone a owl:DatatypeProperty .
ontology:Customer.phone rdfs:domain ontology:Customer .
ontology:Customer.phone rdfs:range xsd:string .
```

And for agents, there's a contract with every concept, its fields, relationships and capabilities, plus a planner that turns an intent into the steps it takes:

```sh
curl localhost:3000/ontology/agent
curl -X POST localhost:3000/ontology/plan -H 'Content-Type: application/json' \
  -d '{"concept":"Appointment","intent":"create"}'
```

```json
{
  "kind": "3flows:OntologyPlan",
  "concept": "Appointment",
  "intent": "create",
  "steps": [
    { "order": 1, "action": "resolve related Customer", "capability": "getCustomer", "sideEffects": false },
    { "order": 2, "action": "create Appointment", "capability": "createAppointment", "requiredInput": ["at", "customer"], "sideEffects": true, "requiresConfirmation": true }
  ],
  "warnings": ["createAppointment has side effects, requires confirmation."]
}
```

## The ontology endpoints

| Endpoint | Returns |
|---|---|
| `GET /ontology`, `/ontology.json` | Domains, classes, properties and relationships as JSON |
| `GET /ontology.jsonld`, `/ontology.ttl`, `/ontology.nt`, `/ontology/context` | The same as JSON-LD, Turtle, N-Triples, and the JSON-LD context |
| `GET /ontology/agent` | The agent contract: concepts with fields, relationships and capabilities |
| `GET /ontology/card?concept=…`, `/ontology/card.md?concept=…` | One concept as JSON or as Markdown |
| `POST /ontology/query` | `{ "select": "concept", "name": … }`, `{ "select": "path", "from": …, "to": … }` and more |
| `GET /ontology/grounding-pack?concept=…&intent=…` | Everything an agent needs for one task: required fields, related concepts, capabilities, warnings |
| `POST /ontology/plan` | A deterministic plan for an intent. It describes the steps; it doesn't execute anything |

:::note
GraphQL doesn't pick up the descriptions yet; `__type` still says `null`. The ontology is where meaning lives. Search (`/ontology/query` with `"select": "concepts"`) matches names and field names, not aliases.
:::

## What you learned

- **Meaning belongs next to the model.** `describe`, `alias` and `example` in the domain are reviewed with the code and can't drift from it.
- **An ontology is the domain, projected for readers.** People get concept cards, catalogs get RDF, and agents get a contract with capabilities and plans.
- Natural keys and relationships are part of what the ontology says about a concept.

## Reviewer's view

> No new behavior. The scheduling domain describes its concepts, and an ontology at `/ontology` publishes them.

Review the descriptions like code: *is "one customer per mobile number" really true?* If a description is wrong, people and agents will act on it.

[Sample: step 12](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/12-ontology) · Next: [An assistant through MCP](./mcp.md)

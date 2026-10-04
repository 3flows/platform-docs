# Domains, ontologies, GraphQL and MCP

The platform has layers for business data. Each one builds on the one below.

| Layer | What it adds | Use it when |
|---|---|---|
| **`docs`** | Store and query JSON documents | You need storage and nothing more |
| **Entities** | Schema validation, identity, timestamps, references, retries | Your data has a shape and relationships |
| **Domain** | One typed model of a part of the business: entities, fields, relationships with inverses, natural keys and meaning | You want one model for code, APIs, tools, agents and reviewers |
| **Ontology** | The domain projected for readers: JSON, JSON-LD, Turtle, concept cards, an agent contract and plans | People, data catalogs or agents need to know what the concepts mean |

From a domain, the platform **generates**:

- entity classes, typed from the domain,
- a GraphQL API with queries, search, counts, mutations and relationship fields ([`graphqls`](../configuration/graphqls.md)),
- an ontology with concept cards and an agent contract ([`ontologies`](../configuration/ontologies.md)),
- MCP resources and tools for agents ([`mcps`](../configuration/mcps.md)),
- descriptions in the [admin API](../configuration/admins.md) and the runtime manifest (`Platform.inspect().domains`).

## Entities

```ts
export const Customers = entity('Customer', Entity.base.extend({ name: t.string(), phone: t.string() }));
export const Appointments = entity('Appointment', Entity.base.extend({ at: t.string(), customer: reference('Customer') }));

const customer = await Customers.create({ name: 'Ada', phone: '+15550000001' });
await Appointments.create({ at: '2030-01-01T10:00:00Z', customer: customer.reference() });
```

## Domains

```ts
export const Scheduling = domain('Scheduling', (d) => {
    const Customer = d
        .entity('Customer', { name: d.string(), phone: d.string().describe('E.164, without spaces') }, { key: ['phone'] })
        .describe('A person who books appointments. One customer per mobile number.')
        .alias('patient');

    const Appointment = d.entity(
        'Appointment',
        { at: d.string(), customer: d.one(Customer).inverse('appointments') },
        { key: ['customer', 'at'] }
    );

    return { Customer, Appointment };
});

export const Customers = Scheduling.Customer;
type Customer = EntityOutput<typeof Scheduling.Customer>;
```

The builder returns typed entities: `Customers.create({ name })` without a phone doesn't compile, and relationships point to entities instead of strings. Register the domain's entities with `entities.domains` in YAML.

| Building block | Example |
|---|---|
| Fields | `d.string()`, `d.number()`, `d.int()`, `d.boolean()`, `d.enum([...])`, modifiers `.optional()`, `.nullable()`, `.default(...)` |
| Relationships | `d.one(Customer)`, `d.many(Tag)`, `.inverse(name)`, `.label(text)` |
| Meaning | `.describe(text)`, `.alias(name)`, `.example(value)` on fields, relationships and entities |
| Options | `{ key, typeName, collection, db, description, aliases, examples }` |
| Composition | `domainEntity(...)`, `domainModule(...)` and `d.use(...)` to split large domains |
| Types | `EntityOutput<T>`, `EntityInput<T>`, `EntityType<T>` |

A **natural key** says what identifies an entity: `{ key: ['phone'] }`. The ID is then derived from the key, so the same data always gets the same entity. That's what makes imports and syncs safe to repeat. See [Transformers, pipelines, flows and lineage](./data-pipelines.md).

## Ontologies

An ontology publishes one or more domains with their meaning: descriptions, aliases, examples, keys, relationships, and the **capabilities** of each concept (read, search, create, update, delete), marked as safe, with side effects, destructive or requiring confirmation. Humans read concept cards, data catalogs read RDF, and agents read the contract and ask for plans.

## MCP

An MCP server exposes chosen handlers as tools, with their contracts as input schemas, and ontologies as resources and tools. Agents get the operations you list, and the meaning of the concepts they work with, but not the generated CRUD API.

## Why this matters for review

A domain is the shortest accurate description of a part of the business. A reviewer can read it in a minute. Generated APIs, ontologies and agent tools follow from it, so reviewing the model *is* reviewing what people and agents can see and do. Review the descriptions like code: people and agents will act on them.

Walk through it hands-on in the tutorial: [Entities](../tutorial/entities.md), [One domain](../tutorial/domain.md), [GraphQL](../tutorial/graphql.md), [Natural keys](../tutorial/natural-keys.md), [Ontology](../tutorial/ontology.md), [MCP](../tutorial/mcp.md).

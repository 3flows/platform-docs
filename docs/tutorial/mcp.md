---
title: 13. An assistant through MCP
---

# 13. An assistant through MCP

**Where we are:** a `Scheduling` domain that says what its concepts mean, published as an ontology. A GraphQL API and the booking handlers.

**What we want:** reception wants an AI assistant that can answer *"what's on tomorrow?"* and book appointments while they're on the phone. AI assistants connect to tools through the [Model Context Protocol](https://modelcontextprotocol.io) (MCP).

## The obvious way

The assistant needs an API, and we have a complete one: GraphQL. Give the assistant the endpoint and let it introspect the schema. It can read everything, and it can write.

## Where it breaks

Look at what it can write. The generated schema has, for every entity, `add…`, `update…` and `delete…` mutations. Ask the assistant to *"move Ada's appointment to 11:00"*, and the obvious call is:

```graphql
mutation {
  updateAppointment(id: "cef8dc9e-…", input: { at: "2030-01-15T11:00:00.000Z" }) { _id at }
}
```

The appointment moves. **Ada isn't told.** The confirmation SMS, the natural-key check for a double booking and everything else we built lives in `bookAppointment`, and the generated mutations go straight to the entities. `deleteCustomer` is one call away, too. GraphQL was made for a front end whose every screen we review. An agent composes calls we never saw, and it doesn't know which of them are dangerous.

What the assistant should get is the opposite of everything: the few operations reception does on the phone, through the same handlers people use, and the meaning of the concepts it works with.

## The concept: an MCP server with chosen tools

`mcps` exposes **handlers you list** as MCP tools, and an **ontology** as MCP resources and tools. YAML only:

```yaml title="platform.yml"
# An MCP server for the reception assistant: only the tools we choose, plus the ontology to understand them.
mcps:
  - name: reception-assistant
    useHttp: api
    path: /mcp
    services:
      - name: AppointmentsService
        handlers:
          - handler: bookAppointment
            name: book_appointment
            description: Book an appointment for a customer and send the confirmation SMS. Booking the same customer and time again returns the existing appointment.
          - handler: listAppointments
            name: list_appointments
            description: List all appointments with the customer's name and phone number.
    ontologies:
      - name: scheduling
```

Each tool is a handler, so it has the handler's contract: the tool's input schema **is** the handler's input schema. The `description` is what the model reads to decide when to call the tool. Say what it changes.

## Run it

```sh
yarn step:13
```

MCP is JSON-RPC over HTTP, so curl works:

```sh
curl -X POST localhost:3000/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

```json
{
  "tools": [
    {
      "name": "book_appointment",
      "description": "Book an appointment for a customer and send the confirmation SMS. …",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "phone": { "type": "string" },
          "at": { "type": "string", "format": "date-time", "description": "Start of the appointment, ISO 8601, e.g. 2030-01-15T10:00:00Z" }
        },
        "required": ["name", "phone", "at"]
      }
    },
    { "name": "list_appointments", … },
    { "name": "ontology_search", … },
    { "name": "ontology_describe_concept", … },
    { "name": "ontology_find_path", … },
    { "name": "ontology_list_capabilities", … },
    { "name": "ontology_describe_capability", … },
    { "name": "ontology_get_grounding_pack", … },
    { "name": "ontology_plan", … }
  ]
}
```

No `update`, no `delete`, no `sendDueReminders`. The assistant books through `bookAppointment`, so Ada gets her confirmation and a double booking returns the existing appointment:

```sh
curl -X POST localhost:3000/mcp -H 'Content-Type: application/json' -d '{
  "jsonrpc":"2.0","id":2,"method":"tools/call",
  "params":{"name":"book_appointment","arguments":{"name":"Ada","phone":"+15550000001","at":"2030-01-15T10:00:00Z"}}}'
```

```json
{
  "content": [{ "type": "text", "text": "{\"name\":\"Ada\",\"phone\":\"+15550000001\",\"at\":\"2030-01-15T10:00:00Z\",\"id\":\"cef8dc9e-…\"}" }],
  "structuredContent": { "name": "Ada", "phone": "+15550000001", "at": "2030-01-15T10:00:00Z", "id": "cef8dc9e-…" }
}
```

When the model gets the arguments wrong, the contract refuses them, and the error doesn't leak internals:

```json
{ "content": [{ "type": "text", "text": "Tool call failed: invalid input" }], "isError": true }
```

Before it acts, the assistant can read what the concepts mean, through the ontology tools and resources from the [last chapter](./ontology.md):

```sh
curl -X POST localhost:3000/mcp -H 'Content-Type: application/json' -d '{
  "jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"ontology://scheduling/cards/Appointment"}}'
```

The card says that `at` is in UTC, and that booking the same slot twice returns the same appointment.

### With a real MCP client

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) connects over HTTP:

```sh
npx @modelcontextprotocol/inspector --cli http://localhost:3000/mcp --transport http --method tools/list
npx @modelcontextprotocol/inspector --cli http://localhost:3000/mcp --transport http \
  --method tools/call --tool-name book_appointment \
  --tool-arg name=Ada --tool-arg phone=+15550000001 --tool-arg at=2030-01-15T10:00:00Z
```

Without `--cli`, it opens a UI in the browser. Assistants that support MCP servers over HTTP connect to the same URL.

## MCP building blocks

| Part | Configuration |
|---|---|
| Tools from handlers | `services[].handlers[]`: a handler name, or `{ handler, name, description }`. Without `handlers`, every handler of the service becomes a tool |
| Tools from services elsewhere | `services[].resolve: true` with explicit `handlers`. Calls go through `remotes` or `discovery` |
| Ontology | `ontologies[].name`: concept cards and the agent contract as resources, `ontology_*` tools for search, paths, capabilities, grounding packs and plans |
| Static resources | `resources[]`: `{ uri, text }`, or `{ uri, type: service-schema, service }` for a service's tool schemas |
| Exposure | `useHttp` and `path` on an existing server, or a `port` of its own. `auth` with an identity provider |

## What you learned

- **An agent gets a toolbox, not the keys.** `mcps` exposes the handlers you list, with their contracts, and nothing else.
- Tools are the same handlers people use, so the business rules in them apply to the agent too.
- The ontology gives the agent the meaning behind the tools: what a concept is, how it's identified, and what's dangerous.

## Reviewer's view

> No code changes. An MCP server at `/mcp` with two tools, `book_appointment` and `list_appointments`, and the scheduling ontology.

The review question: *what may an assistant do on its own?* Every listed handler is something a model may call without asking anyone. In production, put `auth` on the MCP server; it currently has none.

[Sample: step 13](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/13-mcp) · Next: [Part 3: Transformers](./transformers.md)

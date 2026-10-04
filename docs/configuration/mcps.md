# `mcps`

The `mcps` section exposes MCP ([Model Context Protocol](https://modelcontextprotocol.io)) servers for agents and AI assistants: chosen handlers as **tools**, ontologies and text as **resources**.

```yaml
mcps:
  - name: reception-assistant
    useHttp: api
    path: /mcp
    services:
      - name: AppointmentsService
        handlers:
          - handler: bookAppointment
            name: book_appointment
            description: Book an appointment for a customer and send the confirmation SMS.
          - listAppointments
    ontologies:
      - name: scheduling
```

An MCP server needs at least one service, resource or ontology.

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | Server name, reported in `initialize` |
| `useHttp` | | Attach to an existing `https` server. Don't combine with `port` |
| `port` | | Start a dedicated HTTP server |
| `basepath` / `path` | `''` / `/` | Location of the endpoint |
| `services` | `[]` | Services whose handlers become tools |
| `ontologies` | `[]` | `{ name }` of entries in [`ontologies`](./ontologies.md) |
| `resources` | `[]` | Static resources |
| `auth` | | Authentication with an identity provider: `idp`, `identifies`, `audience` |

### `services[]`

| Field | Description |
|---|---|
| `name` | The service |
| `handlers` | Handler names, or `{ handler, name, description }`. Without `handlers`, **every** handler becomes a tool |
| `resolve` | `true` for a service that doesn't run in this process. Calls go through `remotes` or `discovery`; `handlers` must be listed |

Tool names default to `<Service>_<handler>`. The tool's input schema is the handler's input contract, and its description is the handler's description unless set here. Tool names must be unique.

### `ontologies[]`

Each ontology adds:

| Kind | Name |
|---|---|
| Resources | `ontology://<name>/agent`, `/concepts`, `/capabilities`, `/concepts/<Concept>` (JSON), `/cards/<Concept>` (Markdown) |
| Tools | `ontology_search`, `ontology_describe_concept`, `ontology_find_path`, `ontology_list_capabilities`, `ontology_describe_capability`, `ontology_get_grounding_pack`, `ontology_plan` |

With more than one ontology, the tool names are prefixed with the ontology's name.

### `resources[]`

| Type | Fields |
|---|---|
| `text` (default) | `uri`, `text`, optional `name`, `title`, `description`, `mimeType` |
| `service-schema` | `uri`, `service`: the tools of an exposed service with input and output schemas |

## Protocol

`POST <path>` speaks JSON-RPC 2.0 with `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read` and `notifications/initialized`. `GET <path>` lists tools and resources. Clients that connect over HTTP, such as the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), work with the URL directly.

Tool errors are returned as `isError: true` with a safe message (`Tool call failed: invalid input`), without internals.

See the tutorial chapter [An assistant through MCP](../tutorial/mcp.md) for a runnable example.

# `ontologies`

The `ontologies` section publishes [domains](../concepts/domain-model.md) as ontologies: the concepts, their meaning, keys, relationships and capabilities, in formats for people, data catalogs and agents.

```yaml
ontologies:
  - name: scheduling
    useHttp: api
    path: /ontology
    namespace: https://reminders.example.com/ontology/scheduling#
    domains:
      - Scheduling
```

The meaning comes from the domain: `.describe()`, `.alias()` and `.example()` on entities, fields and relationships.

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | Ontology name. MCP servers refer to it, and resource URIs start with `ontology://<name>/` |
| `domains` | `[]` | Domains to publish |
| `namespace` | | Base IRI of the concepts, e.g. `https://example.com/ontology/scheduling#`. `Customer` becomes `<namespace>Customer` |
| `useHttp` | | Attach to an existing `https` server. Don't combine with `port` |
| `port` | | Start a dedicated HTTP server |
| `basepath` / `path` | `''` / `/` | Location of the endpoints |
| `formats` | all `true` | Turn individual formats off: `json`, `jsonld`, `turtle`, `ntriples`, `context` |
| `auth` | | Authentication with an identity provider: `idp`, `identifies`, `audience` |

## Endpoints

Relative to `path`, here `/ontology`:

| Endpoint | Returns |
|---|---|
| `GET /ontology`, `/ontology.json` | Domains, classes, properties and relationships as JSON |
| `GET /ontology.jsonld` | JSON-LD (`owl:Ontology`) |
| `GET /ontology.ttl` | Turtle |
| `GET /ontology.nt` | N-Triples |
| `GET /ontology/context` | The JSON-LD context |
| `GET /ontology/agent`, `/ontology/agent.json` | The agent contract: concepts with fields, relationships and capabilities |
| `GET /ontology/card?concept=…` | One concept as JSON |
| `GET /ontology/card.md?concept=…` | One concept as Markdown |
| `POST /ontology/query` | `{ "select": "concepts", "q": … }`, `concept`, `relationships`, `capabilities`, `capability`, or `{ "select": "path", "from": …, "to": …, "maxDepth": … }` |
| `GET /ontology/grounding-pack?concept=…&intent=…` | What an agent needs for one task: required fields, related concepts, capabilities and warnings |
| `POST /ontology/plan` | `{ "concept": …, "intent": … }`: a deterministic plan. It describes steps; it doesn't execute them |

Intents are `read`, `search`, `create`, `update`, `delete`, `invoke` and `workflow`. Capabilities that change data are marked with side effects; deletes are marked destructive; both require confirmation.

## Limitations

- Search matches concept names, labels, domains and field names, not aliases or descriptions.
- Descriptions aren't part of the GraphQL schema yet.

See the tutorial chapter [Ontology](../tutorial/ontology.md) for a runnable example, and [`mcps`](./mcps.md) to give agents the ontology as MCP resources and tools.

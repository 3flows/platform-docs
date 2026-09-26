# `entities`

The `entities` section connects entities to storage. Entities are defined in code, either with `entity(...)` or through an [ontology](../concepts/domain-model.md).

```yaml
docs:
  - name: DEFAULT
    type: memory

entities:
  backend: docs
  db: appointments
  ontologies:
    - AppointmentsOntology
```

## Fields

| Field | Default | Description |
|---|---|---|
| `backend` | `docs` | Storage backend |
| `use` | `DEFAULT` | Name of the `docs` store |
| `db` | | Database name |
| `retries` / `retryDelay` | `0` | Retries for failed backend operations |
| `entity` | `[]` | Entities defined with `entity(...)` |
| `ontologies` | `[]` | Ontologies whose entities should be registered |

## Per-entity options

```yaml
entities:
  backend: docs
  db: appointments
  entity:
    - name: Customer
      collection: customers
    - name: Appointment
      retries: 2
```

| Field | Description |
|---|---|
| `name` | Entity name |
| `db` / `collection` | Storage location. The collection defaults to the pluralized entity name |
| `use` | A different `docs` store |
| `retries` / `retryDelay` | Override the section defaults |

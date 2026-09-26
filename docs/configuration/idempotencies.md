# `idempotencies`

Idempotency stores track logical event processing to suppress duplicates.

```yaml
idempotencies:
  - name: DEFAULT
    type: memory
```

## Fields

| Field | Required | Description |
|---|---:|---|
| `name` | no | Store name. `DEFAULT` enables default trigger behavior |
| `type` | yes | Store type, currently `memory` |
| `parameters` | no | Provider-specific parameters |

## Default trigger integration

When `idempotencies.DEFAULT` exists:

| Trigger | Key source |
|---|---|
| MQ | route + `correspondenceID` |
| Email | route + `message.id` |
| SMS | route + `message.id` |

Duplicates are skipped and treated as already handled.

## Production note

The memory store is useful for local development and tests. Production deployments should use a durable or shared backend when available.

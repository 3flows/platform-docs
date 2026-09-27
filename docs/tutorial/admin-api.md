---
title: 13. Admin API
---

# 13. Admin API

**Where we are:** a service with entities, an ontology and a generated GraphQL API.

**The problem:** a running system is more than its code. *Which services are up? What configuration is active? How are entities mapped to storage?* Operators, consoles and agents need a way to look inside a running platform.

## The solution: the admin (control-plane) API

YAML only:

```diff title="platform.yml"
+# Read-only control-plane API. Disabled unless explicitly enabled.
+# In production, protect it with `auth` or expose it on an internal HTTP server only.
+admins:
+  - name: admin
+    useHttp: api
+    path: /admin
+    enabled: true
+    readonly: true
```

| Endpoint | Describes |
|---|---|
| `GET /admin/api/summary` | Running state, number of services, read-only and reload flags |
| `GET /admin/api/platform` | The platform instance |
| `GET /admin/api/configuration` | The resolved configuration |
| `GET /admin/api/services` | Every service with its status |
| `GET /admin/api/entities` | Entities with fields, backend, database and collection |
| `GET /admin/api/ontologies` | Ontologies with entities and relationships |
| `GET /admin/api/graphqls` | GraphQL endpoints and what they expose |
| `POST /admin/api/reload` | Reloads the configuration. Only with `readonly: false` and `allowReload: true` |

```sh
curl localhost:3000/admin/api/entities
```

```json
[
  {
    "name": "Appointment",
    "backend": "docs",
    "db": "appointments",
    "collection": "Appointments",
    "fields": [
      { "name": "_id", "type": "string", "required": false },
      { "name": "at", "type": "string", "required": true },
      {
        "name": "customer",
        "type": "object",
        "required": true,
        "reference": { "entity": "Customer", "cardinality": "one" }
      }
    ]
  }
]
```

## Safe by default

- The admin API is **disabled** unless `enabled: true`.
- It's **read-only** by default. Reload must be enabled explicitly.
- It's a JSON API. Consoles and tools build on top of it.

## What you learned

- A running platform can describe itself: services, configuration, model and APIs.
- That description comes from the same primitives and ontology you wrote, which is useful for humans and agents alike.

## Reviewer's view

> No code changes. A read-only admin API at `/admin/api`.

Check that it's protected or internal before it goes to production.

[Sample: step 13](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/13-admin) · Next: [Natural keys](./natural-keys.md)

---
title: 9. Operate it
---

# 9. Operate it

**Where we are:** the appointment app from [chapter 7](./notifications-service.md), with appointments and notifications running in one process. Part 2 of the tutorial continues from there. Everything in it works the same when the services run in separate processes.

**The problem:** before this goes to production, operations will ask: *How do we know it's alive? Where are the metrics? What does the API look like?*

## The solution: it's already there

Every `https` server comes with built-in endpoints. No code needed.

| Endpoint | What it does |
|---|---|
| `GET /ping` | Status of the platform and every infrastructure dependency: docs, kv and so on |
| `GET /health` | `200 OK` if everything is healthy, `500` otherwise, for liveness and readiness probes |
| `GET /metrics` | Prometheus metrics |
| `GET /openapi.json`, `GET /openapi.yml` | OpenAPI 3.1 description of every handler, generated from their schemas |
| `POST /.jsonrpc` | JSON-RPC for every handler |
| `rpc.schema` | JSON-RPC method that describes all methods with their input and output schemas |

```sh
curl localhost:3000/ping
```

```json
{
  "name": "appointment-reminders",
  "status": "OK",
  "pings": [
    {
      "service": "appointmentsservice::default",
      "status": "OK",
      "pings": [
        { "name": "doc::memory::default", "status": "OK" },
        { "name": "kv::memory::default", "status": "OK" }
      ]
    }
  ]
}
```

```sh
curl -X POST localhost:3000/.jsonrpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"rpc.schema"}'
```

## Adapting the endpoints

Your cluster expects the liveness probe at `/healthz`, and metrics shouldn't be public. That's YAML:

```diff title="platform.yml"
 https:
   - name: api
     port: 3000
     services:
       - name: AppointmentsService
+    # Built-in endpoints. Listing them replaces the defaults.
+    wellknown:
+      - type: ping
+        url: ping
+      - type: health
+        url: healthz # what the Kubernetes probes expect
+      - type: openapi.json
+        url: openapi.json
+      - type: metrics
+        url: metrics
+        disabled: true # scraped through a separate, internal port in production
```

Other `https` options include `basepath`, CORS (`useCors`, `corsConfiguration`), request size limits (`security`), WebSockets (`ws`) and authentication (`auth`). See the [HTTP reference](../configuration/https.md).

## What you learned

- **Operability is built in.** Health, metrics and API descriptions come with every HTTP server.
- OpenAPI and `rpc.schema` are generated from the same schemas that validate your handlers, so they can't drift from the code.

## Reviewer's view

> No code changes. The health endpoint moved to `/healthz`, and metrics are no longer exposed on the public port.

[Sample: step 09](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/09-operations) · Next: [Entities](./entities.md)

---
title: 18. Operate it
---

# 18. Operate it

**Where we are:** the complete app: booking and reminders, a domain model with GraphQL, and a data hub with four pipelines and a flow. Everything runs in one process.

**The problem:** before this goes to production, operations will ask: *How do we know it's alive? Where are the metrics? What does the API look like?* With four services, four pipelines and a flow in one process, nobody wants to answer that by hand.

## The solution: it's already there

Every `https` server comes with built-in endpoints. No code needed.

| Endpoint | What it does |
|---|---|
| `GET /ping` | Status of the platform and every infrastructure dependency: docs, kv and so on |
| `GET /health` | `200 OK` if everything is healthy, `500` otherwise, for liveness and readiness probes |
| `GET /metrics` | Prometheus metrics |
| `GET /openapi.json`, `GET /openapi.yml` | OpenAPI 3.1 description of every handler, generated from their schemas |
| `POST /.jsonrpc` | JSON-RPC for every handler. Each service gets one below its base path, such as `/reception/.jsonrpc` |
| `rpc.schema` | JSON-RPC method that describes all methods with their input and output schemas |

```sh
curl localhost:3000/ping
```

```json
{
  "name": "appointment-reminders",
  "version": "0.1.0",
  "status": "OK",
  "pings": [
    {
      "service": "appointmentsservice::default",
      "status": "OK",
      "pings": [
        { "name": "doc::memory::default", "status": "OK" },
        { "name": "kv::memory::default", "status": "OK" },
        { "name": "mq::memory::default", "status": "OK" }
      ]
    },
    { "service": "dataexchangeservice::default", "status": "OK", "pings": [ … ] },
    { "service": "appointmentimportpipeline::default", "status": "OK", "pings": [ … ] },
    { "service": "practicesyncpipeline::default", "status": "OK", "pings": [ … ] },
    { "service": "referralflow::default", "status": "OK", "pings": [ … ] },
    { "service": "receptionservice::default", "status": "OK", "pings": [ … ] }
  ]
}
```

Every service on the server reports itself and its infrastructure. Pipelines and flows are services, so they're included. There's nothing extra to wire up for them.

```sh
curl -X POST localhost:3000/.jsonrpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"rpc.schema"}'
```

The reported `version` comes from your application's `package.json`. It appears in `/ping`, in the OpenAPI description and in the GraphQL `version` field. Without an application `package.json`, the platform's own version is used.

## Adapting the endpoints

Your cluster expects the liveness probe at `/healthz`, and metrics shouldn't be public. That's YAML:

```yaml title="platform.yml"
https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService
      # … the data services, pipelines and flows from Part 3
    # highlight-start
    # Built-in endpoints. Listing them replaces the defaults.
    wellknown:
      - type: ping
        url: ping
      - type: health
        url: healthz # what the Kubernetes probes expect
      - type: openapi.json
        url: openapi.json
      - type: metrics
        url: metrics
        disabled: true # scraped through a separate, internal port in production
    # highlight-end
```

Other `https` options include `basepath`, CORS (`useCors`, `corsConfiguration`), request size limits (`security`), WebSockets (`ws`) and authentication (`auth`). See the [HTTP reference](../configuration/https.md).

## What you learned

- **Operability is built in.** Health, metrics and API descriptions come with every HTTP server.
- OpenAPI and `rpc.schema` are generated from the same schemas that validate your handlers, so they can't drift from the code. The OpenAPI description includes the HTTP triggers of pipelines and flows, such as `POST /data/imports/appointments` and `POST /data/flows/referrals`.

## Reviewer's view

> No code changes. The health endpoint moved to `/healthz`, and metrics are no longer exposed on the public port.

[Sample: step 18](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/18-operations) · Next: [Admin API](./admin-api.md)

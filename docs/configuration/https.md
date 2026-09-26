# `https`

The `https` section configures HTTP servers and exposes service handlers and routes. (`https` is the section name. It's not a TLS setting.)

```yaml
https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService
```

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | HTTP server name, referenced by `useHttp` in `graphqls`, `admins`, registries and so on |
| `port` | `8080` | Port to listen on |
| `displayUrl` | `http://localhost:8080` | Public URL, used in generated descriptions |
| `basepath` | `''` | Prefix for all routes of this server |
| `services` | `[]` | Services to expose: `name`, optional `basepath`, optional `auths` |
| `wellknown` | see below | Built-in endpoints |
| `useCors` / `corsConfiguration` | off | CORS: `origin`, `methods`, `allowedHeaders`, `exposedHeaders`, `credentials` |
| `helmet` | `true` | Security headers |
| `security` | | Limits: `limitJsonBody` (default `16kb`), `limitUrlEncodedBody`, `limitMultipartBody`, `limitMultipartFileTypes`, `limitMultipartFileCount` |
| `ws` | `false` | Enable WebSocket routes |
| `auth` | | Authentication with an identity provider (`idp`, `identifies`, `audience`) |

## What a service exposes

For every service in `services`:

| Endpoint | Source |
|---|---|
| `POST /<handler>` | Each handler, validated by its input schema |
| `POST /.jsonrpc` | JSON-RPC for all handlers, plus `rpc.schema` |
| Custom routes | `route.http().get('/appointments/:id')` and similar in `routes()` |

## Built-in endpoints (`wellknown`)

| Type | Default URL | Description |
|---|---|---|
| `ping` | `/ping` | Status of the platform and its infrastructure, as JSON |
| `health` | `/health` | `200` if healthy, `500` otherwise |
| `metrics` | `/metrics` | Prometheus metrics |
| `openapi.json` | `/openapi.json` | OpenAPI 3.1, generated from handler schemas |
| `openapi.yml` | `/openapi.yml` | The same as YAML |
| `version` | disabled | Service version |

Listing `wellknown` **replaces** the defaults:

```yaml
https:
  - name: api
    port: 3000
    wellknown:
      - type: health
        url: healthz
      - type: metrics
        url: metrics
        disabled: true
```

## Authentication per service

```yaml
https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService
        auths:
          - idp: DEFAULT
            identifies: user
            audience: [appointments]
            excludes: [/ping]
```

See the tutorial chapter [Operate it](../tutorial/operate-it.md) for a runnable example.

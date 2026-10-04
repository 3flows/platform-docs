# `admins`

The `admins` section enables the JSON admin (control-plane) API.

```yaml
admins:
  - name: admin
    useHttp: api
    path: /admin
    enabled: true
    readonly: true
```

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `admin` | Name |
| `useHttp` | `http` | The `https` server to attach to |
| `path` | `/admin` | Base path. The API lives under `<path>/api` |
| `enabled` | `false` | Must be `true` to expose anything |
| `readonly` | `true` | Read-only mode |
| `allowReload` | `false` | Allow `POST <path>/api/reload`. Also requires `readonly: false` |
| `graphqlConsole` | `true` | Include GraphQL endpoints in the summary |
| `auth` | | Authentication with an identity provider |

## Endpoints

`summary`, `platform`, `configuration`, `services`, `entities`, `domains`, `ontologies`, `graphqls` (all `GET`), and `reload` (`POST`).

`domains` describes the domains with their entities, keys and relationships. `ontologies` lists the [ontology projections](./ontologies.md) and where they're served.

In code, `Platform.inspect()` returns the runtime manifest, a typed description of the same platform, including every handler's contracts, the providers and the connectors. See [Platform runtime](../concepts/platform-runtime.md#inspecting-a-running-platform).

:::caution
Protect the admin API with `auth`, or attach it to an internal-only HTTP server, before using it in production.
:::

See the tutorial chapter [Look inside](../tutorial/admin-api.md).

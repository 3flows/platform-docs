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
| `auth` | | Authentication with an identity provider |

## Endpoints

`summary`, `platform`, `configuration`, `services`, `entities`, `ontologies`, `graphqls` (all `GET`), and `reload` (`POST`).

:::caution
Protect the admin API with `auth`, or attach it to an internal-only HTTP server, before using it in production.
:::

See the tutorial chapter [Admin API](../tutorial/admin-api.md).

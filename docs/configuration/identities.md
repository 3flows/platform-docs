# `identities` and `idps`

Workload identity lets platform processes prove who they are when they call each other. The caller **signs** a short-lived token with an identity provider from `identities`. The callee **verifies** it with an identity provider from `idps`.

## Caller

```yaml
runtime:
  identity:
    provider: workloads                       # an entry in identities
    workload: platform://workloads/appointments

identities:
  - name: workloads
    type: signed-jwt
    parameters:
      issuer: platform://identity/appointment-reminders
      secret:
        $vault: { path: workload-identity, key: signingKey }
      ttlSeconds: 300
```

### `identities[]`

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | Referred to by `runtime.identity.provider` |
| `type` | `signed-jwt` | `signed-jwt`: HS256 tokens signed with `secret`. `static-token`: a fixed token |
| `parameters.issuer` | | `iss` of the tokens |
| `parameters.secret` | | Signing key. Use a `$vault` reference |
| `parameters.ttlSeconds` | `300` | Token lifetime |

### `runtime.identity`

| Field | Default | Description |
|---|---|---|
| `provider` | | The `identities` entry that signs |
| `workload` | | The workload's identity, the token's subject |
| `propagation.serviceCalls` | `workload` | `none` turns signing off |
| `propagation.userDelegation` | `none` | User tokens are never forwarded. Delegation isn't supported yet |

A service can override the workload with `services[].identity.workload`.

A token is requested when the callee requires one: through `remotes[].identity.audience`, or, with discovery, from the callee's registration.

## Callee

```yaml
services:
  - name: NotificationsService
    identity:
      audience: platform://services/notifications   # published to the registry

https:
  - name: api
    port: 3001
    services:
      - name: NotificationsService
        auths:
          - idp: workloads
            identifies: service
            audience:
              - platform://services/notifications

idps:
  - name: workloads
    provider: platform-jwt
    parameters:
      issuer: platform://identity/appointment-reminders
      secret:
        $vault: { path: workload-identity, key: signingKey }
```

### `idps[]` with `provider: platform-jwt`

| Field | Description |
|---|---|
| `name` | Referred to by `auths[].idp` |
| `parameters.issuer` | Expected `iss` |
| `parameters.secret` | Verification key, the same as the signing key |

Other `idps` providers (`openid`, `entra`, `keycloak`, `auth0`, `okta`, …) verify user tokens the same way.

### `https[].services[].auths[]`

| Field | Description |
|---|---|
| `idp` | The `idps` entry |
| `identifies` | `service` for workloads, `user` for people |
| `audience` | Accepted audiences |

Requests without a valid token get `401`. Built-in endpoints such as `/health` stay open. In handlers, `trigger.context.identity.workload` and `trigger.context.identity.subject` describe the caller.

### With `remotes`

```yaml
remotes:
  - name: NotificationsService
    url: http://notifications:3001/.jsonrpc
    identity:
      audience: platform://services/notifications
```

:::caution
With `signed-jwt`, the key is shared between signers and verifiers: anything that can read it can sign as any workload. Keep it in a vault, readable only by the processes that need it.
:::

See the tutorial chapter [Workload identity](../tutorial/workload-identity.md) for a runnable example.

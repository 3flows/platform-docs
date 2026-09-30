# `vaults`

The `vaults` section configures secret stores. The configuration takes secrets from them with `$vault` references, and services can read them with `vault(name)`.

```yaml
vaults:
  - name: DEFAULT
    type: memory
    parameters:
      secrets:
        practice-database:
          connectionString: postgres://reader:dev-password@localhost:5432/practice

sqls:
  - name: practice
    type: postgres
    parameters:
      connectionString:
        $vault: { path: practice-database, key: connectionString }
```

A secret lives at a **path** and holds an object with one or more **keys**.

## Fields

| Field | Default | Description |
|---|---|---|
| `name` | `DEFAULT` | Name used by `$vault.name` and `vault(name)` |
| `type` | `memory` | `memory`, `hashicorp`, `azure-key-vault` or `macos-keychain` |
| `parameters` | | Settings of the backend |

## `$vault` references

A `$vault` reference can replace any value in the configuration, outside the `vaults` section.

```yaml
smss:
  - name: DEFAULT
    type: twilio
    parameters:
      authToken:
        $vault: { path: twilio, key: authToken }
      from: '+15550009999'
```

| Field | Required | Description |
|---|---|---|
| `path` | yes | The secret |
| `key` | no | One key of the secret. Without it, the reference is replaced with the whole object |
| `name` | no | The vault to read from. Default: `DEFAULT` |
| `version` | no | A specific version: a positive integer or a non-empty string. Not supported by every backend |

Without a `key`, one reference can fill a whole object:

```yaml
sqls:
  - name: practice
    type: postgres
    # host, port, database, user and password, all from one secret
    parameters:
      $vault: { path: practice-database }
```

How references are resolved:

- **Vaults start first.** Then every `$vault` reference is replaced, and only then does anything else start. Services and providers see plain values.
- **Resolved once.** References are resolved at startup and on every reload that changes the configuration. A reload with unchanged YAML does nothing, so a rotated secret needs a restart. Code that must see rotations reads the secret with `vault()` when it needs it.
- **Fail fast.** A missing secret, key or vault stops the platform from starting. If a reload fails, the previous configuration keeps running.
- **Redacted.** Resolved values are replaced with `[REDACTED]` wherever the platform shows its configuration, for example in the [admin API](./admins.md). So are keys that look like secrets: `password`, `token`, `secret`, `apiKey`, `connectionString`, `credential`, `privateKey` and similar ones.

Rules:

- A reference object has only the `$vault` property. `{ $vault: …, other: … }` is an error.
- References aren't allowed inside `vaults`. A vault's own credentials come from `${{ … }}` or from the environment's identity.
- References need a `vaults` section.

## In code

`vault(name)` returns a vault. It defaults to `DEFAULT`.

```ts
const { vault } = trigger.context;

const signingKey = await vault().secret('partner-webhooks').key('signingKey').get<string>();
const credentials = await vault().secret('partner-webhooks').get<{ signingKey: string }>();

await vault().secret('partner-webhooks').set({ signingKey: 'new-key' });  // replaces the whole secret
await vault().secret('partner-webhooks').key('signingKey').exists();      // true or false
await vault().secret('partner-webhooks').key('signingKey').delete();      // removes one key
await vault('archive').secret('old-api').version(3).get();                // a specific version
```

| Method | Description |
|---|---|
| `secret(path)` | Selects a secret |
| `.key(key)` | Selects one key of the secret |
| `.version(version)` | Selects a version |
| `.get<T>()` | Reads the secret, or one key. Throws `ReferenceError` if it's missing |
| `.set(value)` | Writes the whole secret. `value` must be an object |
| `.delete()` | Deletes the secret, or one key. Returns `false` if it didn't exist |
| `.exists()` | Whether the secret, or the key, exists |

Prefer `$vault` references for credentials of providers. Use `vault()` only for secrets that the code itself needs.

## Memory

For development and tests. Secrets are in the YAML and are kept in memory, so use only fake values.

```yaml
vaults:
  - name: DEFAULT
    type: memory
    parameters:
      secrets:
        twilio:
          accountSid: AC-dev-account
          authToken: dev-auth-token
```

| Parameter | Description |
|---|---|
| `secrets` | Initial secrets: path → object |

Writes with `set` last until the process stops. Versions are accepted but ignored.

## HashiCorp Vault

Uses the KV secrets engine, version 1 or 2.

```yaml
vaults:
  - name: DEFAULT
    type: hashicorp
    parameters:
      address: https://vault.internal:8200
      namespace: admin # Vault Enterprise / HCP only
      auth:
        method: jwt
        role: appointment-reminders
        jwt: ${{ VAULT_JWT }}
      kv:
        mount: secret
        version: 2
```

| Parameter | Default | Description |
|---|---|---|
| `address` | | URL of the Vault server. Required |
| `namespace` | | Sent as `X-Vault-Namespace` |
| `auth.method` | | `token` or `jwt`. Required |
| `auth.token` | | The token, for `method: token` |
| `auth.role`, `auth.jwt` | | Role and JWT, for `method: jwt`. The platform logs in at startup |
| `auth.path` | `jwt` | Mount path of the JWT auth method |
| `kv.mount` | `secret` | Mount path of the KV engine |
| `kv.version` | `2` | KV engine version. Only version 2 supports `version` |

The path `twilio` is `secret/twilio` in Vault: `vault kv put secret/twilio accountSid=… authToken=…`. The health check calls `sys/health`.

## Azure Key Vault

```yaml
vaults:
  - name: DEFAULT
    type: azure-key-vault
    parameters:
      vaultUrl: https://reminders-kv.vault.azure.net
```

| Parameter | Default | Description |
|---|---|---|
| `vaultUrl` | | URL of the key vault. Required |
| `parseJson` | `true` | Parse secret values as JSON, so that `key` works |

Authentication uses `DefaultAzureCredential`: managed identity, workload identity, environment variables or `az login`. No secret needs to be configured.

The path is the secret name, and the value is JSON: `az keyvault secret set --vault-name reminders-kv --name twilio --value '{"accountSid":"…","authToken":"…"}'`. `version` is the secret's version ID. Key Vault secret names allow only letters, digits and dashes, so use names like `practice-database` in every backend.

## macOS Keychain

For a developer's Mac, for example to run against real sandbox accounts without putting their credentials into files. Only available on macOS.

```yaml
vaults:
  - name: DEFAULT
    type: macos-keychain
```

| Parameter | Default | Description |
|---|---|---|
| `service` | `3flows-platform` | Keychain service of all secrets |
| `parseJson` | `true` | Parse secret values as JSON, so that `key` works |
| `cache` | `true` | Keep secrets in memory after the first read |

The path is the keychain account: `security add-generic-password -s 3flows-platform -a twilio -w '{"accountSid":"…","authToken":"…"}'`. Versions aren't supported.

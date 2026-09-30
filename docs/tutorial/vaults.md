---
title: 20. Keep secrets in a vault
---

# 20. Keep secrets in a vault

**Where we are:** the complete app, with health checks, metrics, an OpenAPI description and an admin API. Every provider is still `memory`.

**The problem:** production needs real credentials. SMS goes through Twilio, which needs an account SID and an auth token. The nightly sync from [chapter 14](./sync-from-a-database.md) reads the partner practice's PostgreSQL database, and its connection string contains a password. Where do they go?

Not into `platform.yml`, because it's committed. `${{ TWILIO_AUTH_TOKEN }}` works, but then the secret sits in the process environment. Every child process inherits it, it ends up in crash dumps and `docker inspect`, and it gets copied into every deployment manifest. Nobody can tell who read it, and rotating it means redeploying. Security wants secrets in a vault, such as HashiCorp Vault or Azure Key Vault, and not in the environment.

## The solution: `vaults` and `$vault` references

This chapter changes YAML only, in two places. The sample checks that every `.ts` file is identical to [chapter 19](./admin-api.md).

**First, say where secrets come from.** In development and tests, the vault is `memory`. Its secrets are in the YAML, and they're fake:

```yaml title="platform.yml"
# highlight-start
# Where secrets come from. The vault starts first; `$vault` references anywhere below are resolved from it
# before any other service starts. In production, only this entry changes: hashicorp, azure-key-vault or
# macos-keychain instead of memory. The references stay the same.
vaults:
  - name: DEFAULT
    type: memory
    parameters:
      # Fake values for development and tests. Real ones never appear in YAML.
      secrets:
        practice-database:
          connectionString: postgres://reader:dev-password@localhost:5432/practice
        twilio:
          accountSid: AC-dev-account
          authToken: dev-auth-token
# highlight-end
```

A secret lives at a **path**, like `twilio`, and holds an object with one or more **keys**, like `accountSid` and `authToken`.

**Then, reference secrets where they're needed:**

```yaml title="platform.yml"
sqls:
  - name: practice
    # highlight-start
    type: memory # postgres in production; the credentials are already in place
    parameters:
      connectionString:
        $vault: { path: practice-database, key: connectionString }
    # highlight-end

smss:
  - name: DEFAULT
    # highlight-start
    type: memory # twilio in production; the credentials are already in place
    parameters:
      accountSid:
        $vault: { path: twilio, key: accountSid }
      authToken:
        $vault: { path: twilio, key: authToken }
      from: '+15550009999'
    # highlight-end
```

A `$vault` reference can replace any value in the configuration. At startup, the platform:

1. starts the `vaults` section first,
2. replaces every `$vault` reference with the value from the vault,
3. starts everything else.

The providers get plain strings. They don't know the values came from a vault, and the application code doesn't know either. The memory providers ignore these parameters, but the credentials are in place for the day the `type` changes.

| Field | Required | Description |
|---|---|---|
| `path` | yes | The secret |
| `key` | no | One key of the secret. Without it, the reference is replaced with the whole object |
| `name` | no | The vault to read from. Default: `DEFAULT` |
| `version` | no | A specific version, where the backend keeps versions |

## Run it

```sh
yarn step:20
curl localhost:3000/admin/api/configuration
```

The admin API from the last chapter shows the configuration. It shows where a secret comes from, but never its value:

```json
{
  "vaults": [{ "name": "DEFAULT", "type": "memory", "parameters": { "secrets": "[REDACTED]" } }],
  "sqls": [{ "name": "practice", "type": "memory", "parameters": { "connectionString": "[REDACTED]" } }],
  "smss": [
    {
      "name": "DEFAULT",
      "type": "memory",
      "parameters": {
        "accountSid": { "$vault": { "path": "twilio", "key": "accountSid" } },
        "authToken": "[REDACTED]",
        "from": "+15550009999"
      }
    }
  ]
}
```

Every value resolved from a vault is redacted wherever the platform shows its configuration. So is every key that looks like a secret: `password`, `token`, `secret`, `apiKey`, `connectionString` and similar ones. A reference like `accountSid` above is shown as it is, because it only says where the secret comes from.

Now remove `twilio` from the vault's secrets and start again. The platform doesn't start:

```text
ReferenceError: Secret twilio is not defined
```

A missing secret fails at startup, not at 3 a.m. when the first reminder goes out. If a reload fails this way, the previous configuration keeps running.

## Going to production

The `$vault` references stay as they are. Only the `vaults` entry and the provider types change:

```yaml title="platform.yml (production)"
vaults:
  - name: DEFAULT
    # highlight-start
    type: hashicorp
    parameters:
      address: https://vault.internal:8200
      auth:
        method: jwt
        role: appointment-reminders
        jwt: ${{ VAULT_JWT }} # the Kubernetes service account token
      kv: { mount: secret, version: 2 }
    # highlight-end

sqls:
  - name: practice
    # highlight-next-line
    type: postgres
    parameters:
      connectionString:
        $vault: { path: practice-database, key: connectionString }

smss:
  - name: DEFAULT
    # highlight-next-line
    type: twilio
    parameters:
      accountSid:
        $vault: { path: twilio, key: accountSid }
      authToken:
        $vault: { path: twilio, key: authToken }
      from: '+15550009999'
```

The vault needs credentials of its own, and `$vault` references aren't allowed inside `vaults`. So these come from the environment, ideally as an identity rather than a stored secret: a short-lived service account JWT on Kubernetes, or no secret at all with Azure managed identity.

| `type` | Use it for | Authentication |
|---|---|---|
| `memory` | Development and tests | None. Secrets are in the YAML |
| `macos-keychain` | A developer's Mac, against real sandbox accounts | The login keychain of the user |
| `hashicorp` | HashiCorp Vault, KV version 1 or 2 | A token, or JWT login with a role |
| `azure-key-vault` | Azure Key Vault | `DefaultAzureCredential`: managed identity, workload identity or `az login` |

Putting the same secrets into each of them:

```sh
# HashiCorp Vault
vault kv put secret/twilio accountSid=AC… authToken=…

# Azure Key Vault: the secret is stored as JSON
az keyvault secret set --vault-name reminders-kv --name twilio \
  --value '{"accountSid":"AC…","authToken":"…"}'

# macOS Keychain: the service is 3flows-platform, the account is the path
security add-generic-password -s 3flows-platform -a twilio \
  -w '{"accountSid":"AC…","authToken":"…"}'
```

:::tip
Name secrets so they work in every backend. Azure Key Vault allows only letters, digits and dashes, so use `practice-database`, not `databases/practice`.
:::

Every backend is described in the [vaults reference](../configuration/vaults.md).

## Secrets in code

This app doesn't need secrets in code: every credential belongs to a provider, and providers get theirs from YAML. When code does need a secret itself, for example to sign a webhook for a partner, it reads the secret through the context, like any other infrastructure:

```ts
const signingKey = await trigger.context.vault().secret('partner-webhooks').key('signingKey').get<string>();
```

## What you learned

- **Secrets are infrastructure too.** `vaults` says where they come from, and `$vault` says where they go. The values are never in YAML, code or the process environment.
- Between development and production, only the `vaults` entry changes. The references stay the same.
- Resolved secrets are redacted wherever the platform shows its configuration, including the admin API.
- A missing secret stops the platform from starting.

## Reviewer's view

> No code changes. A `vaults` entry, and three `$vault` references: the Twilio account SID and auth token, and the partner database's connection string.

The review question is *who may read these secrets?* That isn't in YAML. It's the vault's policy: the HashiCorp role or the Key Vault access policy of this process. Review it together with this change.

:::note
Secrets are read once, at startup. A rotated secret is picked up on the next restart. `Platform.reload()` with unchanged YAML does nothing.
:::

[Sample: step 20](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/20-vaults) · Next: [Part 5: Separate processes](./separate-processes.md)

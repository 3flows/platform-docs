---
title: 26. Workload identity
---

# 26. Workload identity

**Where we are:** three processes: a registry, notifications, and appointments, which finds notifications through the registry.

**What we want:** only our own processes may call notifications.

## The obvious way

Trust the network. Notifications runs on an internal network, and only appointments knows its address.

## Where it breaks

Anybody who can reach port 3001 can text anybody, in our name:

```sh
yarn step:25:registry        # terminal 1
yarn step:25:notifications   # terminal 2
yarn step:25:appointments    # terminal 3

curl -X POST localhost:3001/sendReminder -H 'Content-Type: application/json' \
  -d '{"id":"x","name":"Mallory","phone":"+15550006666","at":"2030-01-01T10:00:00Z"}'
# {"sent":true}
```

And the address isn't a secret anymore: the registry hands it to anybody who asks. "Internal" networks hold more than our processes: other teams' services, build agents, a compromised pod. And when something does go wrong, notifications can't tell who called it.

The next obvious fix is a shared API key in a header. Then every caller has the same key, forever, it can't say *who* is calling, and if it leaks, it leaks for everybody until someone rotates it everywhere at once.

## The concept: workload identity

Every process gets an **identity**. When it calls another process, the platform signs a short-lived token that says *who* is calling (`platform://workloads/appointments`) and *for whom* it's meant (`platform://services/notifications`). The called process verifies the token and refuses everything else. Application code doesn't change: the sample checks that every `.ts` file is still identical to [chapter 23](./vaults.md).

**The caller,** `appointments.yml`, says who it is and how to sign:

```yaml title="appointments.yml"
name: appointments

# highlight-start
# Who this process is when it calls other processes.
runtime:
  identity:
    provider: workloads
    workload: platform://workloads/appointments
# highlight-end

# … services, pipelines, flows, https, registries and discovery unchanged

vaults:
  - name: DEFAULT
    type: memory
    parameters:
      secrets:
        # … practice-database and slack-reception unchanged
        # highlight-start
        workload-identity:
          signingKey: dev-workload-signing-key-change-me
        # highlight-end

# highlight-start
# Signs a short-lived token for every call to another process. The key comes from the vault.
identities:
  - name: workloads
    type: signed-jwt
    parameters:
      issuer: platform://identity/appointment-reminders
      secret:
        $vault: { path: workload-identity, key: signingKey }
      ttlSeconds: 300
# highlight-end
```

**The callee,** `notifications.yml`, says who may call it:

```yaml title="notifications.yml"
services:
  - name: NotificationsService
    # highlight-start
    # Callers ask for a token for this audience. Discovery tells them which one.
    identity:
      audience: platform://services/notifications
    # highlight-end

https:
  - name: api
    port: 3001
    services:
      - name: NotificationsService
        # highlight-start
        # Only workloads with a valid token for this audience may call. Anyone else gets 401.
        auths:
          - idp: workloads
            identifies: service
            audience:
              - platform://services/notifications
        # highlight-end

# highlight-start
# Who may sign workload tokens: verified with the shared key from the vault.
idps:
  - name: workloads
    provider: platform-jwt
    parameters:
      issuer: platform://identity/appointment-reminders
      secret:
        $vault: { path: workload-identity, key: signingKey }
# highlight-end

vaults:
  - name: DEFAULT
    type: memory
    parameters:
      secrets:
        # … twilio unchanged
        # highlight-start
        workload-identity:
          signingKey: dev-workload-signing-key-change-me
        # highlight-end

# … smss, mqs, registries and discovery unchanged
```

When appointments calls `service('NotificationsService')`, the platform now:

1. resolves notifications through the registry, which also says that it requires a token for `platform://services/notifications`,
2. asks the `workloads` identity provider for a token: subject `platform://workloads/appointments`, that audience, valid for five minutes,
3. sends the call with `Authorization: Bearer …`.

Notifications verifies the signature, the issuer and the audience before the handler runs. In the handler, `trigger.context.identity.workload.id` says which workload called.

## Run it again

```sh
yarn step:26:registry        # terminal 1
yarn step:26:notifications   # terminal 2
yarn step:26:appointments    # terminal 3

curl -i -X POST localhost:3001/sendReminder -H 'Content-Type: application/json' \
  -d '{"id":"x","name":"Mallory","phone":"+15550006666","at":"2030-01-01T10:00:00Z"}'
```

```txt
HTTP/1.1 401 Unauthorized
{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Bearer token is not provided in the request","instance":"/sendReminder"}
```

A token signed with any other key is refused the same way. Booking still works, because appointments signs its calls:

```sh
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

Terminal 2 logs Ada's confirmation. The reminder run and the referral flow's `notify-practice` step sign their calls too. The registry shows what notifications requires:

```sh
curl -X POST localhost:3100/.registry/list
```

```json
{
  "registrations": [
    {
      "service": "NotificationsService",
      "transports": { "jsonrpc": { "url": "http://127.0.0.1:3001/.jsonrpc" } },
      "identity": { "audience": "platform://services/notifications", "required": true },
      …
    }
  ]
}
```

`/health` stays open, so probes keep working. The signing key never shows up in the admin API.

## Identity building blocks

| Part | Configuration |
|---|---|
| Who a process is | `runtime.identity`: `provider` (an `identities` entry) and `workload`. A service can override it with `services[].identity.workload` |
| Signing | `identities[]`: `type: signed-jwt` with `issuer`, `secret` and `ttlSeconds`, or `type: static-token` |
| What a callee requires | `services[].identity.audience`. Discovery passes it to callers; with `remotes`, set `remotes[].identity.audience` |
| Verifying | `idps[]`: `provider: platform-jwt` with `issuer` and `secret`. `https[].services[].auths[]` with `idp`, `identifies: service` and `audience` |
| Propagation | `runtime.identity.propagation.serviceCalls: workload` (default) or `none`. User tokens are never forwarded; the call carries the workload's identity |
| In handlers | `trigger.context.identity.workload` and `trigger.context.identity.subject` |

## What you learned

- **Processes prove who they are.** Every call between processes carries a short-lived, signed token for exactly one audience.
- The callee decides who may call it, in its own YAML, and the registry tells callers what it requires.
- The signing key is a secret like any other: it comes from the vault, and each process gets only what it needs.

## Reviewer's view

> No code changes. Appointments signs its calls as `platform://workloads/appointments`. Notifications only accepts tokens for `platform://services/notifications`, signed with the key from the vault.

The review questions: *who else has the signing key?* With `signed-jwt`, the key is shared: anything that can read it can sign as any workload. Keep it in the vault, readable only by these two processes, and rotate it with a [reload](./vaults.md). And *what isn't covered yet?* The registry itself, the Slack server and the public API on port 3000 don't use workload identity; the first two belong on an internal network, the third needs user authentication (`auth` on `https`).

[Sample: step 26](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/26-workload-identity) · Next: [What's next](./whats-next.md)

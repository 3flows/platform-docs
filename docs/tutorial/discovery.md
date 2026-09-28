---
title: 21. Discovery
---

# 21. Discovery

**Where we are:** appointments and notifications run in two processes. `appointments.yml` has a `remotes` entry with the URL of the notifications process.

**The problem:** the caller knows where the callee lives. Operations wants to move notifications to its own host. That's a change to `appointments.yml` and a redeployment of a process that didn't change at all. The next process that sends notifications, say a separate worker for the nightly imports, would repeat the same URL. Every copy is one more place to forget when notifications moves again.

The only process that really knows where notifications runs is notifications itself.

## The solution: a registry

Turn it around. **Services say where they are, and callers look them up.** The platform calls the place where that happens a registry.

Application code doesn't change, again. The sample checks that every `.ts` file is still identical to [chapter 19](./admin-api.md).

**The registry:** a third, small process. In the sample, it keeps registrations in memory.

```yaml title="registry.yml"
name: registry

# The phone book of the platform: services register here, and callers look them up.
registries:
  - name: DEFAULT
    type: memory
    port: 3100
    basepath: .registry
```

**Notifications registers itself:**

```yaml title="notifications.yml"
# … services, https, smss and mqs unchanged

# highlight-start
# Where the registry is.
registries:
  - name: DEFAULT
    type: http
    parameters:
      url: http://127.0.0.1:3100/.registry

# Register every service on the `api` server, reachable at this URL. Heartbeats keep the entry alive.
discovery:
  registry: DEFAULT
  register: true
  advertise:
    http: api
    url: http://127.0.0.1:3001
# highlight-end
```

**Appointments looks it up.** The `remotes` entry is replaced:

```yaml title="appointments.yml"
# highlight-start
# Where the registry is.
registries:
  - name: DEFAULT
    type: http
    parameters:
      url: http://127.0.0.1:3100/.registry

# Services that don't run here are looked up in the registry. No URLs of other processes in this file.
discovery:
  registry: DEFAULT
  resolve:
    unknownServices: true
# highlight-end
```

When the app calls `service('NotificationsService')`, the platform now looks in this order:

1. A local service with that name. There isn't one.
2. A `remotes` entry. There isn't one anymore.
3. The registry. Found, so the platform calls the URL that notifications registered.

## Run it

```sh
npm run step:21:registry        # terminal 1
npm run step:21:notifications   # terminal 2
npm run step:21:appointments    # terminal 3
```

Ask the registry what it knows:

```sh
curl -X POST localhost:3100/.registry/list
```

```json
{
  "registrations": [
    {
      "service": "NotificationsService",
      "instanceId": "notifications:NotificationsService",
      "runtimeId": "notifications",
      "status": "ready",
      "handlers": ["appointmentBooked", "sendReminder", "referralsReceived", "referralsReviewed", "outbox"],
      "transports": { "jsonrpc": { "url": "http://127.0.0.1:3001/.jsonrpc" } },
      "lastHeartbeatAt": "2026-09-28T10:48:58.054Z",
      "ttlMs": 30000,
      …
    }
  ]
}
```

Notifications registered its service, its handlers and its URL. Book an appointment on port 3000, and terminal 2 logs the confirmation SMS, as before.

Moving notifications is now a change to `notifications.yml` only: its `https` port and its `advertise.url`.

## How registration works

| | |
|---|---|
| What's registered | Every service on the `https` server named in `advertise.http`, with its handlers and JSON-RPC URL |
| Heartbeats | Every 10 seconds (`heartbeatIntervalMs`). A registration without heartbeats expires after 30 seconds (`ttlMs`) |
| Shutdown | A process that stops unregisters its services |
| Instance ID | `<runtime id>:<service>`. The runtime ID is `runtime.id`, or the `name` of the configuration |
| Registry API | `POST /.registry/register`, `unregister`, `heartbeat`, `resolve` and `list` |

:::caution
Two instances of notifications with the same `name` get the same instance ID and replace each other's registration. Give every instance its own `runtime.id`, for example from an environment variable:

```yaml
runtime:
  id: ${{ HOSTNAME }}
```
:::

## What you learned

- **A service says where it is. Callers only say what they need.** Topology lives with the process it describes.
- Resolution goes local, `remotes`, registry. Code and call sites never change.

## Reviewer's view

> No code changes. A registry process. Notifications registers itself, appointments resolves unknown services through the registry. `remotes` is gone.

The review questions move to operations: *what happens when the registry is down?* Calls are resolved through the registry every time, so every call to a service in another process fails until it's back. Run it like the infrastructure it now is. And *who may register?* Anything that can reach the registry can claim to be `NotificationsService`, so keep it on an internal network.

[Sample: step 21](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/21-discovery) · Next: [What's next](./whats-next.md)

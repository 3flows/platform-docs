---
title: 25. Discovery
---

# 25. Discovery

**Where we are:** appointments and notifications run in two processes. `appointments.yml` has a `remotes` entry with the URL of the notifications process.

**What we want:** operations wants to move notifications to its own host, and a second process, a worker for the nightly imports, will send notifications too.

## The obvious way

Change the URL in `appointments.yml`, and copy the `remotes` entry into the worker's YAML.

## Where it breaks

The caller knows where the callee lives. Moving notifications is now a change to `appointments.yml` and a redeployment of a process that didn't change at all. The worker repeats the same URL, and so will the next process. Every copy is one more place to forget when notifications moves again, and the failure mode is a 3 a.m. `ECONNREFUSED` in the process that *didn't* move.

The only process that really knows where notifications runs is notifications itself.

## The concept: a registry

Turn it around. **Services say where they are, and callers look them up.** The platform calls the place where that happens a registry.

Application code doesn't change, again. The sample checks that every `.ts` file is still identical to [chapter 23](./vaults.md).

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
# … services, https, vaults, smss and mqs unchanged

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

## Run it again

```sh
yarn step:25:registry        # terminal 1
yarn step:25:notifications   # terminal 2
yarn step:25:appointments    # terminal 3
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
      "handlers": ["appointmentBooked", "sendReminder", "referralsReviewed", "outbox"],
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

## The catch

Discovery made it easy to find notifications. It was always easy to *call* it: port 3001 answers anybody who can reach it.

[Sample: step 25](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/25-discovery) · Next: [Workload identity](./workload-identity.md)

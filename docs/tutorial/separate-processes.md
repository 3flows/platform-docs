---
title: 8. Separate processes
---

# 8. Separate processes

**Where we are:** two services, `AppointmentsService` and `NotificationsService`, run in one process.

**The problem:** notifications should be deployed and scaled independently. A burst of reminders shouldn't slow down booking, and the SMS provider credentials should live in one place only.

## The solution: change YAML, not code

`appointments.ts` and `notifications.ts` are **identical** to the previous chapter. The sample repository even checks this.

Only the configuration is split in two.

**Notifications process:** exposes its handlers on port 3001 and owns SMS and the queue.

```yaml title="notifications.yml"
name: notifications

services:
  - name: NotificationsService

https:
  - name: api
    port: 3001
    services:
      - name: NotificationsService

smss:
  - name: DEFAULT
    type: memory

mqs:
  - name: DEFAULT
    type: memory
    use:
      - NotificationsService
```

**Appointments process:** no longer runs notifications and gets a `remotes` entry instead.

```yaml title="appointments.yml"
name: appointments

services:
  - name: AppointmentsService

https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService

# NotificationsService is not running here anymore; calls go to the other process.
remotes:
  - name: NotificationsService
    url: http://127.0.0.1:3001/.jsonrpc

docs:
  - name: DEFAULT
    type: memory

kvs:
  - name: DEFAULT
    type: memory

timers:
  - service: AppointmentsService
    name: reminders
    cron: '0 * * * * *'
    runImmediatly: false
```

When `AppointmentsService` calls `service('NotificationsService')`, the platform looks for the service in this order:

1. A local service with that name. There isn't one anymore.
2. A `remotes` entry. Found, so the platform calls it over JSON-RPC.

## Run it

```sh
npm run step:08:notifications   # terminal 1
npm run step:08:appointments    # terminal 2

curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

Terminal 1, the notifications process, logs the confirmation SMS. Ask it what it delivered:

```sh
curl -X POST localhost:3001/.jsonrpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"outbox"}'
```

## What you learned

- **The same code runs in one process or in several.** Deployment topology is a configuration decision.
- `remotes` tells the platform where a service lives when it's not local.

## Reviewer's view

> No code changes. Two new YAML files, one `remotes` entry.

This is the smallest possible review for a significant architectural change.

[Sample: step 08](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/08-separate-processes) · Next: [Part 2: Operate it](./operate-it.md)

---
title: 21. Separate processes
---

# 21. Separate processes

**Where we are:** the complete app runs in one process: booking, reminders, GraphQL, the data hub, the referral flow and the notifications that all of them send. Its secrets come from a vault.

**The problem:** notifications should be deployed and scaled independently. A nightly import that makes 800 appointments due shouldn't slow down booking. And the Twilio credentials from the [last chapter](./vaults.md) should be readable by one process only, not by the process that also parses CSV uploads from partners.

## The solution: change YAML, not code

Every `.ts` file is **identical** to the previous chapter. The sample repository even checks this.

Back in [chapter 7](./notifications-service.md), every part of the app learned to call notifications by name:

```ts
await service('NotificationsService').method('appointmentBooked').input(appointment).call();
```

That's the booking handler, the reminder timer and both steps of the referral flow. None of them know where `NotificationsService` runs. So only the configuration is split in two.

**Notifications process:** exposes its handlers on port 3001, and owns SMS, the Twilio secret and the confirmations queue.

```yaml title="notifications.yml"
name: notifications

services:
  - name: NotificationsService

https:
  - name: api
    port: 3001
    services:
      - name: NotificationsService

# highlight-start
# Where secrets come from. This process only gets the secrets it uses: Twilio.
vaults:
  - name: DEFAULT
    type: memory
    parameters:
      # Fake values for development and tests. Real ones never appear in YAML.
      secrets:
        twilio:
          accountSid: AC-dev-account
          authToken: dev-auth-token
# highlight-end

smss:
  - name: DEFAULT
    type: memory # twilio in production; the credentials are already in place
    parameters:
      accountSid:
        $vault: { path: twilio, key: accountSid }
      authToken:
        $vault: { path: twilio, key: authToken }
      from: '+15550009999'

mqs:
  - name: DEFAULT
    type: memory
    use:
      - NotificationsService
```

**Appointments process:** everything else. It no longer runs notifications, and gets a `remotes` entry instead. Compared to the last chapter's `platform.yml`:

```yaml title="appointments.yml"
# highlight-next-line
name: appointments

services:
  - name: AppointmentsService
  # NotificationsService is gone
  - name: DataExchangeService
  - name: ReceptionService

# … pipelines, flows, https, docs, entities, sqls and kvs unchanged

# highlight-start
# Where secrets come from. This process only gets the secrets it uses: the partner database.
vaults:
  - name: DEFAULT
    type: memory
    parameters:
      # Fake values for development and tests. Real ones never appear in YAML.
      secrets:
        practice-database:
          connectionString: postgres://reader:dev-password@localhost:5432/practice
# highlight-end

# highlight-start
# NotificationsService is not running here anymore; calls go to the other process.
remotes:
  - name: NotificationsService
    url: http://127.0.0.1:3001/.jsonrpc
# highlight-end

# smss is gone, and so is the twilio secret: SMS credentials live in the notifications process only.

mqs:
  - name: DEFAULT
    type: memory
    use:
      # highlight-next-line
      - CrmCustomersPipeline # the confirmations queue moved with NotificationsService
```

When the app calls `service('NotificationsService')`, the platform looks for the service in this order:

1. A local service with that name. There isn't one anymore.
2. A `remotes` entry. Found, so the platform calls it over JSON-RPC.

## Run it

```sh
yarn step:21:notifications   # terminal 1
yarn step:21:appointments    # terminal 2

curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

Terminal 1, the notifications process, logs the confirmation SMS. Ask it what it delivered:

```sh
curl -X POST localhost:3001/.jsonrpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"outbox"}'
```

Send a referral batch as in [chapter 17](./flows.md): the flow in terminal 2 notifies reception through terminal 1. The flow doesn't notice the difference, and its report looks the same.

## What you learned

- **The same code runs in one process or in several.** Deployment topology is a configuration decision.
- `remotes` tells the platform where a service lives when it's not local.
- **Each process gets only the secrets it uses.** The `$vault` references moved with the providers that need them.

## Reviewer's view

> No code changes. Two YAML files instead of one, and one `remotes` entry. SMS and the Twilio secret moved to the notifications process.

In production, give each process its own vault identity (a HashiCorp role, or a managed identity for Key Vault), so the appointments process can't read the Twilio secret even if it asks for it.

This is the smallest possible review for a significant architectural change.

## The catch

`appointments.yml` now contains the address of the notifications process. When notifications moves to another host or port, the appointments process has to be reconfigured and redeployed. And every new process that sends notifications repeats the same URL.

[Sample: step 21](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/21-separate-processes) · Next: [Discovery](./discovery.md)

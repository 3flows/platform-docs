---
title: 24. Separate processes
---

# 24. Separate processes

**Where we are:** the complete app runs in one process: booking, reminders, GraphQL, the MCP server, the data hub, the referral flow, the Slack connector and the notifications that all of them send. Its secrets come from a vault.

**What we want:** notifications deployed and scaled on their own. A nightly import that makes 800 appointments due shouldn't slow down booking. And the Twilio credentials from the [last chapter](./vaults.md) should be readable by one process only, not by the process that also parses CSV uploads from partners.

## The obvious way

Run notifications as a second app, and replace every call to it with an HTTP request:

```ts
await fetch(`${process.env.NOTIFICATIONS_URL}/sendReminder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointment)
});
```

## Where it breaks

Count the call sites: the booking handler, the reminder run, and the `notify-practice` step of the referral flow, which isn't even a function call but a declaration, `.call('NotificationsService')`. Each needs the URL, error handling, a timeout, and its own idea of what a failed response looks like. Every test that ran in one process now needs two. And the decision *"notifications runs elsewhere"*, an operations decision, has become a code change in three places that a reviewer has to check one by one.

## The concept: change YAML, not code

Every `.ts` file is **identical** to the previous chapter. The sample repository even checks this.

Back in [chapter 7](./notifications-service.md), every part of the app learned to call notifications by name:

```ts
await service('NotificationsService').method('appointmentBooked').input(appointment).call();
```

That's the booking handler, the reminder timer and the `notify-practice` step of the referral flow. None of them know where `NotificationsService` runs. So only the configuration is split in two.

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

# … pipelines, flows, https (with the slack server), docs, entities, sqls, kvs, graphqls, admins,
# ontologies, mcps and connectors unchanged

# highlight-start
# Where secrets come from. This process only gets the secrets it uses: the partner database and Slack.
vaults:
  - name: DEFAULT
    type: memory
    parameters:
      # Fake values for development and tests. Real ones never appear in YAML.
      secrets:
        practice-database:
          connectionString: postgres://reader:dev-password@localhost:5432/practice
        slack-reception:
          botToken: xoxb-dev-token
          signingSecret: dev-signing-secret
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
      - ReceptionService # Slack events are delivered to its connector routes through a queue
```

When the app calls `service('NotificationsService')`, the platform looks for the service in this order:

1. A local service with that name. There isn't one anymore.
2. A `remotes` entry. Found, so the platform calls it over JSON-RPC.

## Run it

```sh
yarn step:24:notifications   # terminal 1
yarn step:24:appointments    # terminal 2

curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
```

Terminal 1, the notifications process, logs the confirmation SMS. Ask it what it delivered:

```sh
curl -X POST localhost:3001/.jsonrpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"outbox"}'
```

Send a referral batch as in [chapter 20](./slack.md) and react in Slack: the flow in terminal 2 tells the practice through terminal 1. The flow doesn't notice the difference, and its report looks the same.

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

There's a second catch, which [chapter 26](./workload-identity.md) deals with: port 3001 now answers anybody.

[Sample: step 24](https://github.com/3flows/platform-samples/tree/main/appointment-reminders/steps/24-separate-processes) · Next: [Discovery](./discovery.md)

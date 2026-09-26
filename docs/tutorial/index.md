---
title: Tutorial overview
sidebar_label: Overview
slug: /tutorial
---

# Build an appointment reminder app

In this tutorial you build a small but real application: customers book appointments, get a confirmation by SMS, and receive a reminder 24 hours before their appointment.

You start with Hello World and add **one concept per chapter**. Every chapter follows the same pattern:

- **Where we are:** the app so far
- **The problem:** what's missing or broken
- **The solution:** the smallest change that fixes it
- **Run it:** see it working
- **Reviewer's view:** what a human needs to understand to approve the change

## The journey

| Chapter | Problem | Concept |
|---|---|---|
| [0. Hello World](./hello-world.md) | How little does it take? | Service, handler, YAML |
| [1. Book an appointment](./book-an-appointment.md) | We need a real API | Handlers with schemas |
| [2. Store appointments](./store-appointments.md) | Appointments disappear | `docs` |
| [3. Confirm by SMS](./confirm-by-sms.md) | Customers want a confirmation | `sms` |
| [4. Send reminders](./send-reminders.md) | Remind customers in time | Timers |
| [5. Remind only once](./remind-only-once.md) | Customers get the reminder again and again | `kv` |
| [6. Don't block booking](./dont-block-booking.md) | A slow SMS provider slows booking | `mq` |
| [7. A notifications service](./notifications-service.md) | One service does too much | Service-to-service calls |
| [8. Separate processes](./separate-processes.md) | Notifications should run on their own | `remotes` |

Watch for one recurring theme: from chapter 7 on, **the service code stops changing**. Only YAML does.

## The samples

Every chapter has a complete, tested project in the [platform-samples](https://github.com/3flows/platform-samples/tree/main/appointment-reminders) repository. All steps use in-memory providers, so you need no database, message broker or SMS account.

Requirements: Node.js 24+.

```sh
git clone https://github.com/3flows/platform-samples.git
cd platform-samples/appointment-reminders
npm install
npm test          # runs the test of every step
npm run step:00   # runs a single step
```

:::note
The samples use platform features that are not yet published to the package registry. Until they are, the samples reference a sibling checkout of the platform repository. See the [samples README](https://github.com/3flows/platform-samples#run) for details.
:::

Ready? Start with [Hello World](./hello-world.md).

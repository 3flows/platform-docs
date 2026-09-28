---
title: Tutorial overview
sidebar_label: Overview
slug: /tutorial
---

# Build an appointment reminder app

In this tutorial you build a small but real application: customers book appointments, get a confirmation by SMS, and receive a reminder 24 hours before their appointment. Then you give it a domain model and a generated GraphQL API. It becomes a small data hub that imports, syncs and reviews data through pipelines and flows. Finally, you operate it and split it across processes.

You start with Hello World and add **one concept per chapter**. Every chapter follows the same pattern:

- **Where we are:** the app so far
- **The problem:** what's missing or broken
- **The solution:** the smallest change that fixes it
- **Run it:** see it working
- **Reviewer's view:** what a human needs to understand to approve the change

## The journey

Every chapter continues from the one before it. The app only grows.

### Part 1: Build it

The basic primitives: services, storage, messaging and time.

| Chapter | Problem | Concept |
|---|---|---|
| [Set up a project](./setup.md) | Where do I start? | `package.json`, `.yarnrc.yml`, `tsconfig.json` |
| [0. Hello World](./hello-world.md) | How little does it take? | Service, handler, YAML |
| [1. Book an appointment](./book-an-appointment.md) | We need a real API | Handlers with schemas |
| [2. Store appointments](./store-appointments.md) | Appointments disappear | `docs` |
| [3. Confirm by SMS](./confirm-by-sms.md) | Customers want a confirmation | `sms` |
| [4. Send reminders](./send-reminders.md) | Remind customers in time | Timers |
| [5. Remind only once](./remind-only-once.md) | Customers get the reminder again and again | `kv` |
| [6. Don't block booking](./dont-block-booking.md) | A slow SMS provider slows booking | `mq` |
| [7. A notifications service](./notifications-service.md) | One service does too much | Service-to-service calls |

### Part 2: Model and expose it

The data gets a shape, and the front end gets an API it can query freely.

| Chapter | Problem | Concept |
|---|---|---|
| [8. Entities](./entities.md) | Customers are duplicated, and nothing is validated | Entities and references |
| [9. Ontology](./ontology.md) | The domain model is implicit and scattered | Ontology |
| [10. GraphQL](./graphql.md) | The front end needs flexible queries | GraphQL generated from the ontology |
| [11. Natural keys](./natural-keys.md) | GraphQL creates a second Ada | Natural keys in the ontology |

### Part 3: Become a data hub

Data now arrives from more than one place, and not all of it should go live right away.

| Chapter | Problem | Concept |
|---|---|---|
| [12. Transformers](./transformers.md) | Import the old system's CSV, export for analytics | Transformers |
| [13. Pipelines](./pipelines.md) | Every data source repeats the same plumbing | Pipelines with HTTP and queue triggers |
| [14. Sync from a database](./sync-from-a-database.md) | A partner's data sits in a SQL database | `sqls`, SQL sources and timer triggers |
| [15. Dead letters](./dead-letters.md) | Bad records vanish or stop everything | Error policies and dead letters |
| [16. Medallion layers and lineage](./medallion-and-lineage.md) | Can we replay? Where does the data come from? | Bronze, silver, gold and lineage |
| [17. Flows](./flows.md) | Reception must approve referrals first, and that takes days | Flows: steps, waits, conditions and retries |

### Part 4: Operate it

Before it goes to production, operations wants to look inside.

| Chapter | Problem | Concept |
|---|---|---|
| [18. Operate it](./operate-it.md) | Is it alive? What does the API look like? | `/ping`, `/health`, `/metrics`, OpenAPI, JSON-RPC |
| [19. Admin API](./admin-api.md) | What is actually running? | Admin / control-plane API |

### Part 5: Scale it

The same code, in more than one process.

| Chapter | Problem | Concept |
|---|---|---|
| [20. Separate processes](./separate-processes.md) | Notifications should run on their own | `remotes` |
| [21. Discovery](./discovery.md) | Every caller hardcodes where notifications live | `registries` and `discovery` |

Watch for one recurring theme: more and more chapters need **no code changes at all**. Only YAML changes. In Part 3, the code that remains is mostly declarations: a key, a mapping, a pipeline, a flow. Parts 4 and 5 change no application code at all.

## The samples

Every chapter has a complete, tested project in the [platform-samples](https://github.com/3flows/platform-samples/tree/main/appointment-reminders) repository. All steps use in-memory providers, so you need no database, message broker or SMS account.

Requirements: access to the 3flows repositories, Node.js 24+ and Corepack, which comes with Node.js.

The samples use platform features that are not yet published to the package registry. Until they are, they link a checkout of the platform next to the samples:

```sh
corepack enable
git clone https://github.com/3flows/platform.git
(cd platform && git checkout nx && yarn install && yarn build)
git clone https://github.com/3flows/platform-samples.git
cd platform-samples/appointment-reminders
yarn install
yarn test      # runs the test of every step
yarn step:00   # runs a single step
```

Ready? To follow along in your own project, [set one up](./setup.md) first. Otherwise, start with [Hello World](./hello-world.md).

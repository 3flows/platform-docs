---
title: Tutorial overview
sidebar_label: Overview
slug: /tutorial
---

# Build an appointment reminder app

In this tutorial you build a small but real application: customers book appointments, get a confirmation by SMS, and receive a reminder in the 24 hours before their appointment. Then you give it a domain model, a generated GraphQL API, an ontology and an MCP server for an AI assistant. It becomes a small data hub that imports, syncs and reviews data through pipelines and flows. Reception starts working in Slack. Finally, you operate it, move its secrets into a vault, split it across processes and make sure only your own processes can call each other.

## How every chapter works

You won't be handed a concept and told to use it. Every chapter follows the path a developer would actually take:

1. **The obvious way.** You need something new, and you build it the way you'd build it anywhere: an array, a `fetch`, a `setInterval`, an HTTP route. You run it, and it works.
2. **Where it breaks.** You do one more thing (restart the process, book with a bad date, run the tests, let the provider retry) and watch it break. Every chapter gives you the commands to see it yourself.
3. **The concept.** One platform concept that fixes exactly that problem, and the smallest change that introduces it.
4. **Run it again.** The same commands, and now it works.
5. **Reviewer's view.** What a human needs to understand to approve the change, in a few lines.

You can always stop at step 1, have something that works, and know why you'll want step 3 later.

## The journey

Every chapter continues from the one before it. The app only grows.

### Part 1: Build it

The basic primitives: services, contracts, storage, messaging and time.

| Chapter | The obvious way | Where it breaks | Concept |
|---|---|---|---|
| [Set up a project](./setup.md) | | | `package.json`, `.yarnrc.yml`, `tsconfig.json` |
| [0. Hello World](./hello-world.md) | | | Service, handler, YAML |
| [1. Book an appointment](./book-an-appointment.md) | Accept any JSON | `"at": "tomorrow"` is stored | Handler contracts |
| [2. Store appointments](./store-appointments.md) | An array in the service | A restart loses everything | `docs` |
| [3. Confirm by SMS](./confirm-by-sms.md) | `fetch` to the SMS provider's API | Every run needs an account, every test texts someone | `sms` |
| [4. Send reminders](./send-reminders.md) | `setInterval` | The tests never finish | Timers |
| [5. Remind only once](./remind-only-once.md) | A `Set` of reminded IDs | A restart reminds everyone again | `kv` |
| [6. Don't block booking](./dont-block-booking.md) | Don't `await` the SMS | One failed SMS crashes the whole API | `mq` |
| [7. A notifications service](./notifications-service.md) | Import the SMS functions | Notifications can never leave the booking process | Service-to-service calls |

### Part 2: Model it and open it up

The data gets a shape, the front end gets an API, and people and agents learn what it means.

| Chapter | The obvious way | Where it breaks | Concept |
|---|---|---|---|
| [8. Entities](./entities.md) | Customer data inside each appointment | Ada twice, and nothing is validated | Entities and references |
| [9. One domain](./domain.md) | Separate `entity()` calls | A typo in a reference compiles and runs | `domain` |
| [10. GraphQL](./graphql.md) | One handler per query | Every new screen needs a new handler | GraphQL generated from the domain |
| [11. Natural keys](./natural-keys.md) | Find-or-create in a handler | GraphQL creates a second Ada | Natural keys |
| [12. Ontology](./ontology.md) | The GraphQL schema as documentation | `at: String!`, but in which time zone? | `ontologies` |
| [13. An assistant through MCP](./mcp.md) | Give the assistant GraphQL | It can move appointments without telling anyone | `mcps` |

### Part 3: Become a data hub

Data now arrives from more than one place, and not all of it should go live right away.

| Chapter | The obvious way | Where it breaks | Concept |
|---|---|---|---|
| [14. Transformers](./transformers.md) | `split(';')` in a handler | Formats, broken rows, file size | Transformers |
| [15. Pipelines](./pipelines.md) | A handler per data source | Every source repeats the same plumbing | Pipelines |
| [16. Sync from a database](./sync-from-a-database.md) | A SQL client and a cron job | Drivers, credentials and "last synced" bookkeeping | `sqls`, SQL sources, timer triggers |
| [17. Dead letters](./dead-letters.md) | Skip invalid records | "Which two rows are missing?" | Dead letters |
| [18. Medallion layers and lineage](./medallion-and-lineage.md) | Map straight into the model | No replay, no idea where data came from | Bronze, silver, gold and lineage |
| [19. Flows](./flows.md) | A `status` field and two handlers | A process nobody can read | Flows |

### Part 4: Connect it

The app meets the tools people already work in.

| Chapter | The obvious way | Where it breaks | Concept |
|---|---|---|---|
| [20. Reception works in Slack](./slack.md) | Slack's API with `fetch`, and an HTTP route for its events | Anyone can approve, Slack's retries approve twice | Connectors |

### Part 5: Operate it

Before it goes to production, operations wants to look inside.

| Chapter | The obvious way | Where it breaks | Concept |
|---|---|---|---|
| [21. Operate it](./operate-it.md) | A `/health` handler | It says OK while the database is down | Built-in endpoints |
| [22. Look inside](./admin-api.md) | Read the YAML | The YAML isn't what's running | Admin API and `Platform.inspect()` |
| [23. Keep secrets in a vault](./vaults.md) | `${{ TWILIO_AUTH_TOKEN }}` | Secrets in every environment dump | `vaults` and `$vault` |

### Part 6: Scale it

The same code, in more than one process.

| Chapter | The obvious way | Where it breaks | Concept |
|---|---|---|---|
| [24. Separate processes](./separate-processes.md) | Replace calls with HTTP clients | Every call site changes | `remotes` |
| [25. Discovery](./discovery.md) | The URL in the caller's YAML | Moving a service redeploys its callers | `registries` and `discovery` |
| [26. Workload identity](./workload-identity.md) | Trust the network | Anyone who can reach notifications can text anyone | `identities` and `idps` |

Watch for one recurring theme: more and more chapters need **no code changes at all**. In Part 2, a key replaces a lookup and a few `describe()` calls replace a wiki page. In Part 3, the code that remains is mostly declarations. Parts 5 and 6 change no application code at all.

## The samples

Every chapter has a complete, tested project in the [platform-samples](https://github.com/3flows/platform-samples/tree/main/appointment-reminders) repository. All steps use in-memory providers, so you need no database, message broker, SMS account, Slack workspace or vault.

Requirements: access to the 3flows repositories, a GitHub token with `read:packages` for the platform package, and Node.js 24+ with Corepack. The [setup page](./setup.md) explains all three.

```sh
corepack enable
export NPM_REPOSITORY_GH_TOKEN=<a GitHub token with read:packages>
git clone https://github.com/3flows/platform-samples.git
cd platform-samples/appointment-reminders
yarn install
yarn test      # runs the test of every step
yarn step:00   # runs a single step
```

Ready? To follow along in your own project, [set one up](./setup.md) first. Otherwise, start with [Hello World](./hello-world.md).

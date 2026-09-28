---
title: What's next
---

# What's next

You built an appointment reminder app with:

- two services and a small, readable API
- documents in `docs`, markers in `kv`
- SMS confirmations and reminders
- a timer and a message queue
- entities, an ontology and a generated GraphQL API
- natural keys, so the same customer is recognized wherever it comes from
- pipelines that import CSV uploads, take CRM messages and sync a SQL database every night
- dead letters for bad records, bronze, silver and gold layers, and lineage for every run
- a flow that waits for reception before referred patients are booked
- built-in health, metrics, API descriptions and an admin API
- two processes that find each other through a registry, with no code changes needed to split them

And every piece used a handful of primitives that both humans and agents can read.

Look back at the parts once more. Part 1 was code. In Part 2, the model took over: a key replaced a lookup. In Part 3, the code that grew was a key, two mappings, four pipeline declarations and one flow, each of them its own summary. Parts 4 and 5 changed no application code at all.

## Coming next in this tutorial

Running more than one instance of the same process raises new questions. These chapters are in preparation:

- **Scaling out:** run two appointments instances without sending every reminder twice. Covers coordinators and singleton timers.
- **Duplicate safety:** SMS providers and message brokers retry, so the platform needs to skip events it has already handled. Covers idempotency.
- **Going to production:** replace memory providers with MongoDB, Redis, RabbitMQ, PostgreSQL and Twilio, and enable strict mode.

Until then, the [guides](../guides/distributed-platform.md) already describe these features.

## Learn more

- [Why 3flows Platform](../why.md)
- [Core concepts](../concepts/platform-runtime.md)
- [Entities, ontologies and GraphQL](../concepts/domain-model.md)
- [Transformers, pipelines, flows and lineage](../concepts/data-pipelines.md)
- [Configuration reference](../configuration/overview.md)

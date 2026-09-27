---
title: What's next
---

# What's next

You built an appointment reminder app with:

- two services and a small, readable API
- documents in `docs`, markers in `kv`
- SMS confirmations and reminders
- a timer and a message queue
- two processes, with no code changes needed to split them
- built-in health, metrics and API descriptions
- entities, an ontology, a generated GraphQL API and an admin API
- natural keys, so the same customer is recognized wherever it comes from
- pipelines that import CSV uploads, take CRM messages and sync a SQL database every night
- dead letters for bad records, bronze, silver and gold layers, and lineage for every run

And every piece used a handful of primitives that both humans and agents can read.

Look back at Part 3 once more: the app took data from four sources, but the code that grew was a key, two mappings and three pipeline declarations. Each of them reads like its own summary.

## Coming next in this tutorial

Running more than one instance of the same process raises new questions. These chapters are in preparation:

- **Discovery:** stop hardcoding `remotes` URLs, and let services register and find each other through a registry.
- **Scaling out:** run two appointments instances without sending every reminder twice. Covers coordinators and singleton timers.
- **Duplicate safety:** SMS providers and message brokers retry, so the platform needs to skip events it has already handled. Covers idempotency.
- **Going to production:** replace memory providers with MongoDB, Redis, RabbitMQ, PostgreSQL and Twilio, and enable strict mode.

Until then, the [guides](../guides/distributed-platform.md) already describe these features.

## Learn more

- [Why 3flows Platform](../why.md)
- [Core concepts](../concepts/platform-runtime.md)
- [Entities, ontologies and GraphQL](../concepts/domain-model.md)
- [Transformers, pipelines and lineage](../concepts/data-pipelines.md)
- [Configuration reference](../configuration/overview.md)

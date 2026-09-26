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

And every piece used a handful of primitives that both humans and agents can read.

## Coming next in this tutorial

Running more than one instance of the same process raises new questions. These chapters are in preparation:

- **Discovery:** stop hardcoding `remotes` URLs, and let services register and find each other through a registry.
- **Scaling out:** run two appointments instances without sending every reminder twice. Covers coordinators and singleton timers.
- **Duplicate safety:** SMS providers and message brokers retry, so the platform needs to skip events it has already handled. Covers idempotency.
- **Going to production:** replace memory providers with MongoDB, Redis, RabbitMQ and Twilio, and enable strict mode.

Until then, the [guides](../guides/distributed-platform.md) already describe these features.

## Learn more

- [Why 3flows Platform](../why.md)
- [Core concepts](../concepts/platform-runtime.md)
- [Entities, ontologies and GraphQL](../concepts/domain-model.md)
- [Configuration reference](../configuration/overview.md)

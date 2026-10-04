---
title: What's next
---

# What's next

You built an appointment reminder app with:

- two services with enforced contracts and a small, readable API
- documents in `docs`, markers in `kv`
- SMS confirmations and reminders, a timer and a message queue
- one typed domain with entities, relationships and natural keys, so the same customer is recognized wherever it comes from
- a generated GraphQL API
- an ontology that says what the concepts mean, for people, catalogs and agents
- an MCP server that gives an AI assistant exactly two tools
- pipelines that import CSV uploads, take CRM messages and sync a SQL database every night
- dead letters for bad records, bronze, silver and gold layers, and lineage for every run
- a flow that waits for reception's decision, which reception makes in Slack, through a connector that drops duplicates and dead-letters failures
- built-in health, metrics, API descriptions, an admin API and a runtime manifest
- secrets in a vault, referenced from YAML and never shown by the platform
- three processes that find each other through a registry and prove who they are with workload tokens, with no code changes needed to split them

Every chapter went the same way: the obvious solution worked, then broke in a way you could see, and one platform concept fixed it. Look back at what that did to the code. Part 1 was code. In Part 2, the model took over: a key replaced a lookup, and a few `describe()` calls replaced a wiki page. In Part 3, the code that grew was a key, two mappings, four pipeline declarations and one flow, each of them its own summary. Part 4 replaced a few hundred lines of webhook plumbing with a connector and one route. Parts 5 and 6 changed no application code at all.

## Coming next in this tutorial

Running more than one instance of the same process raises new questions. These chapters are in preparation:

- **Scaling out:** run two appointments instances without sending every reminder twice. Covers coordinators and singleton timers.
- **Duplicate safety everywhere:** the Slack connector already drops duplicate events. Queues and inbound SMS can do the same with the `idempotencies` store.
- **Going to production:** replace memory providers with MongoDB, Redis, RabbitMQ, PostgreSQL, Twilio and Slack, take their credentials from HashiCorp Vault or Azure Key Vault, and enable strict mode.

Until then, the [guides](../guides/distributed-platform.md) already describe these features.

## Learn more

- [Why 3flows Platform](../why.md)
- [Core concepts](../concepts/platform-runtime.md)
- [Domains, ontologies, GraphQL and MCP](../concepts/domain-model.md)
- [Transformers, pipelines, flows and lineage](../concepts/data-pipelines.md)
- [Connectors](../concepts/connectors.md)
- [Configuration reference](../configuration/overview.md)

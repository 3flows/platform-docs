---
title: Why 3flows Platform
sidebar_label: Why 3flows Platform
---

# Why 3flows Platform

## Encoded experience

The simplest way to describe the 3flows Platform: **it encodes experience.**

Building a reliable system from scratch is hard, especially for junior developers. Too many decisions require experience that takes years to develop. Instead of expecting every developer to have that experience, we encoded it into the platform.

## How: abstraction, one fluent API, and YAML

**Abstraction.** If you need a document database, you use `docs`. If you need file storage, you use `blobs`. If you need a key-value store, you use `kv`. The platform takes care of what sits underneath and how it works.

**A fluent API.** Developers work with the same patterns across all platform services, without having to learn every underlying technology:

```ts
await doc().collection('appointments').by(id).set(appointment);
await kv().bracket('reminded').key(id).set(new Date().toISOString());
await sms().to(phone).body('Your appointment is confirmed.').send();
```

**Configuration in YAML.** YAML describes what an application needs. The implementation stays with the platform:

```yaml
docs:
  - name: DEFAULT
    type: memory   # or mongo, postgres
```

**One place for dependencies.** Technology choices are maintained and evolved centrally in the platform, not repeated in every application.

**Portability.** An application can use MongoDB locally and Cosmos DB elsewhere without major changes to the application itself. The technology underneath changes; the interface stays the same.

## Does this still make sense with agents?

With coding agents, we can now build a new backend for a platform service in hours instead of days. That raises an honest question: **do we still need a platform at all?**

If the job were only to plan and build, it would be hard to justify an extra layer. Agents can create basic infrastructure code directly, and an abstraction can easily become one more thing they have to deal with.

But the problem has moved. **Writing code is no longer the bottleneck. Review is.** We can create code much faster than we can review it.

The hard part of review is responsibility. At some point, a human has to say: *this is good enough, this is safe, this can go to production.* Agents can help with the review, but today they do not take that accountability. The same is true for running and changing a system: a production system has to keep working after we change it, and somebody has to own the consequences. Today, that somebody is still a human.

## A shared language for humans and agents

That changes what the platform is for. **The platform is written for the human who has to understand and take responsibility for the system.**

If you know the platform primitives, you can read code produced by an agent and understand what it does. `docs`, `blobs`, `kv`, `mq`, `sms` and timers give humans and agents a small, shared vocabulary for the fundamentals. The agent writes the code. The human reads it, reviews it, and takes responsibility for it.

## Production-hardened implementations

Every implementation behind a primitive has to earn its place. Once an implementation, for example MongoDB for `docs`, has gone the full road to production with our customers, including hardening, penetration testing and security reviews, it gives us a solid basis to take responsibility for it again in the next project.

Scaling out implementations becomes much easier with agents. The next `docs` backend or the next SQL dialect can be built by an agent. But it will be built on fundamentals and design principles that have already been hardened in real production.

## So: yes

We still need this abstraction layer, and we will keep working on the 3flows Platform. Not because we built it, but because it lets humans stay responsible for systems that agents help build.

**See it for yourself:** the [tutorial](./tutorial/index.md) builds an appointment reminder app from Hello World to two cooperating processes, one small step at a time.

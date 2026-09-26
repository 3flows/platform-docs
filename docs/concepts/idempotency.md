# Idempotency

Idempotency answers one question:

> Have we already processed this exact event?

It protects handlers from duplicate delivery, retries, and repeated polling.

## Idempotency keys

An idempotency key should identify the logical event, not the process that received it.

Examples:

| Source | Common key |
|---|---|
| MQ | Message ID or `correspondenceID` |
| Email | Provider message ID or email message ID |
| SMS | Provider message ID, for example Twilio `MessageSid` |
| Webhook | Provider event ID or delivery header |
| Timer | Timer name plus scheduled slot |

## Configure an idempotency store

```yaml
idempotencies:
  - name: DEFAULT
    type: memory
```

When `idempotencies.DEFAULT` exists, supported async triggers automatically use it.

## Current default duplicate handling

| Trigger | Auto key | Behavior with `idempotencies.DEFAULT` |
|---|---|---|
| MQ | route + `correspondenceID` | duplicate completed messages are skipped |
| Email | route + `message.id` | duplicate completed messages are skipped |
| SMS | route + `message.id` | duplicate completed messages are skipped |

If no idempotency store is configured, these triggers continue to process normally. That is useful for development and backwards compatibility, but production async systems should use a durable idempotency store when available.

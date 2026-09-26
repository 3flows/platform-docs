# Ownership

Ownership answers one question:

> Who is allowed to look for or run work?

This matters when the same platform configuration runs in more than one process.

## Examples

| Trigger type | Recommended ownership |
|---|---|
| Timer | Singleton when duplicated platform instances exist |
| Email polling | Singleton poller, then idempotency per message |
| SMS polling | Singleton poller, then idempotency per message |
| MQ queue | Competing consumers; let the broker distribute messages |
| HTTP webhook | No singleton lock; use idempotency per event |

## Coordinators

Coordinators provide distributed leases.

```yaml
coordinators:
  - name: DEFAULT
    type: memory
    port: 10160
    basepath: .coordinator
```

A timer can explicitly use a coordinator:

```yaml
timers:
  - service: CleanupService
    name: cleanup
    cron: '* * * * * *'
    ownership:
      mode: singleton
      coordinator: DEFAULT
      ttlMs: 10000
```

## Timer default

If a timer has no explicit ownership and a `DEFAULT` coordinator exists, the platform defaults the timer to singleton ownership.

If no coordinator exists, the timer runs locally in each platform instance and logs a warning unless strict triggering is enabled.

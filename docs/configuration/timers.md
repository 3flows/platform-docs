# `timers`

The `timers` section configures cron-like timer triggers.

```yaml
timers:
  - service: CleanupService
    name: cleanup
    cron: '* * * * * *'
    runImmediatly: true
```

## Fields

| Field | Required | Description |
|---|---:|---|
| `service` | yes | Service that owns the timer route |
| `name` | no | Timer route name. Defaults may apply |
| `cron` | yes | Cron expression |
| `runImmediatly` | no | Run immediately on startup |
| `ownership` | no | Ownership policy |

## Singleton ownership

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

## Safe default

If no ownership is configured and a `DEFAULT` coordinator exists, the timer defaults to singleton ownership.

If no coordinator exists, it runs locally in every platform instance and logs a warning unless strict triggering is enabled.

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

## Failure state

Timer work is awaited. If a timer route throws, the platform logs the failure, increments `platform_timer_failures_total`, records the failure in `Platform.inspect().timers`, and keeps the process running.

```ts
const timer = Platform.inspect().timers.find((timer) => timer.name === 'cleanup');
timer?.active;
timer?.lastRunAt;
timer?.lastError;
timer?.failures;
```

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

If no coordinator exists, it runs locally in every platform instance and logs a warning unless strict triggering is enabled. The same ownership behavior applies to YAML timers and to pipeline/flow timer triggers declared in code.

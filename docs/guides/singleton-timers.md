# Singleton timers

When the same timer configuration runs in multiple platform instances, every instance would normally fire the timer. Use coordinators to make timers singleton.

## Coordinator server

```yaml
coordinators:
  - name: DEFAULT
    type: memory
    port: 10160
    basepath: .coordinator
```

## Worker timer

```yaml
coordinators:
  - name: DEFAULT
    type: http
    parameters:
      url: http://127.0.0.1:10160/.coordinator

timers:
  - service: CleanupService
    name: cleanup
    cron: '* * * * * *'
```

Because a `DEFAULT` coordinator exists, the timer defaults to singleton ownership.

## Explicit ownership

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

## Strict mode

Strict mode turns unsafe missing ownership into startup errors.

```yaml
triggering:
  strict: true
```

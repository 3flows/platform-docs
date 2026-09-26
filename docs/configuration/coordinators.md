# `coordinators`

Coordinators provide distributed leases for ownership decisions.

## Coordinator server

```yaml
coordinators:
  - name: DEFAULT
    type: memory
    port: 10160
    basepath: .coordinator
```

## Coordinator HTTP client

```yaml
coordinators:
  - name: DEFAULT
    type: http
    parameters:
      url: http://127.0.0.1:10160/.coordinator
```

## Used by timers

Timers can use coordinators for singleton execution:

```yaml
timers:
  - service: CleanupService
    name: cleanup
    cron: '* * * * * *'
    ownership:
      mode: singleton
      coordinator: DEFAULT
```

If `DEFAULT` coordinator exists, timers without ownership default to singleton.

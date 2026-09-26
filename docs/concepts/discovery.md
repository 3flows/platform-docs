# Discovery

Discovery allows service-to-service calls to resolve through a registry instead of static configuration.

Resolution order is:

1. Local service
2. Static `remotes`
3. Discovery registry

This keeps service code stable while deployment topology changes.

## Registry server

```yaml
registries:
  - name: DEFAULT
    type: memory
    port: 10150
    basepath: .registry
```

## Provider registration

```yaml
discovery:
  registry: DEFAULT
  register: true
  advertise:
    http: api
    url: http://127.0.0.1:10151
```

## Consumer resolution

```yaml
discovery:
  registry: DEFAULT
  resolve:
    unknownServices: true
```

## Service call

The code does not care whether the service is local or remote.

```ts
await this.service('PaymentsService').call('charge', { amount: 100 });
```

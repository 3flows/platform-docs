# Distributed platform

The platform lets you move from a single process to multiple processes without changing service call code.

## Single-process deployment

```yaml
services:
  - name: OrdersService
  - name: PaymentsService
```

```ts
await this.service('PaymentsService').call('charge', params);
```

The call resolves locally.

## Registry process

Run a registry that providers and consumers can use.

```yaml
registries:
  - name: DEFAULT
    type: memory
    port: 10150
    basepath: .registry
```

## Provider process

The provider exposes HTTP and registers its services.

```yaml
services:
  - name: PaymentsService

https:
  - name: api
    port: 10151
    services:
      - PaymentsService

registries:
  - name: DEFAULT
    type: http
    parameters:
      url: http://127.0.0.1:10150/.registry

discovery:
  registry: DEFAULT
  register: true
  advertise:
    http: api
    url: http://127.0.0.1:10151
```

## Consumer process

The consumer resolves unknown services through the registry.

```yaml
services:
  - name: OrdersService

registries:
  - name: DEFAULT
    type: http
    parameters:
      url: http://127.0.0.1:10150/.registry

discovery:
  registry: DEFAULT
  resolve:
    unknownServices: true
```

## Result

`OrdersService` still calls:

```ts
await this.service('PaymentsService').call('charge', params);
```

The platform decides whether the target is local, statically remote, or discovered.

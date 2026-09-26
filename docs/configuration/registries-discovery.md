# `registries` and `discovery`

Registries store service registrations. Discovery uses a registry to register local services and resolve unknown services.

## Registry server

```yaml
registries:
  - name: DEFAULT
    type: memory
    port: 10150
    basepath: .registry
```

## Registry HTTP client

```yaml
registries:
  - name: DEFAULT
    type: http
    parameters:
      url: http://127.0.0.1:10150/.registry
```

## Provider discovery

```yaml
discovery:
  registry: DEFAULT
  register: true
  advertise:
    http: api
    url: http://127.0.0.1:10151
```

## Consumer discovery

```yaml
discovery:
  registry: DEFAULT
  resolve:
    unknownServices: true
```

## Notes

Registry HTTP exposure is owned by the registry configuration itself. It does not require explicitly adding the registry as an HTTP service.

# `https`

The `https` section configures HTTP servers and attaches service routes.

```yaml
https:
  - name: api
    port: 3000
    services:
      - OrdersService
```

## Fields

| Field | Required | Description |
|---|---:|---|
| `name` | yes | HTTP server name |
| `port` | yes | Port to listen on |
| `services` | no | Service routes to expose on this HTTP server |

## Route example

```ts
route.http().get('/orders').do(async () => {
  return [{ id: 'order-1' }];
});
```

# Deployment

Deployment can start simple and become distributed as needed.

## Local development

```yaml
services:
  - name: OrdersService

https:
  - name: api
    port: 3000
    services:
      - name: OrdersService

mqs:
  - name: DEFAULT
    type: memory

idempotencies:
  - name: DEFAULT
    type: memory
```

## Distributed deployment

A typical distributed setup has:

- service processes
- HTTP endpoints
- registry process or registry backend
- coordinator process or coordinator backend
- idempotency store
- optional static remotes for fixed dependencies

## Production recommendations

- Use discovery instead of hardcoding every service endpoint.
- Use coordinators for singleton timers and polling workloads.
- Use idempotency for asynchronous triggers such as MQ, email, SMS, and webhooks.
- Prefer durable/shared idempotency and coordination backends when available.


## Public docs deployment

This documentation site is designed to deploy to GitHub Pages. Set the correct `url`, `baseUrl`, `organizationName`, and `projectName` in `docusaurus.config.js` before publishing.

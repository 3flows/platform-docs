---
sidebar_position: 2
---

# Getting started

This guide creates a small HTTP service and runs it with the platform.

## Install

```bash
npm install @3flows/platform
```

## Create a service

```ts
import { Platform, Register, Route, Service } from '@3flows/platform';

@Register()
class HelloService extends Service {
  routes(): Route {
    const route = super.routes();

    route.http().get('/hello').do(async () => {
      return { message: 'hello from 3flows' };
    });

    return route;
  }
}

await Platform.run('./platform.yml');
```

## Configure the platform

Create `platform.yml`:

```yaml
name: hello platform

services:
  - name: HelloService

https:
  - name: api
    port: 3000
    services:
      - HelloService
```

## Run

```bash
node dist/index.js
```

Then call:

```bash
curl http://localhost:3000/hello
```

Response:

```json
{
  "message": "hello from 3flows"
}
```

## What happened?

1. The service class was registered with `@Register()`.
2. The YAML `services` section started `HelloService`.
3. The YAML `https` section exposed its HTTP routes on port `3000`.
4. The route handler returned a JSON response.

## Next steps

- Add [service-to-service calls](./guides/service-to-service-calls.md)
- Learn [configuration](./configuration/overview.md)
- Run multiple instances with [distributed platform](./guides/distributed-platform.md)

# Testing

Platform tests usually run real YAML configurations.

## Basic pattern

```ts
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import * as platform from '@3flows/platform';

describe('My platform test', () => {
  before(async () => {
    await platform.Platform.run('./tests/my-platform.yml');
  });

  after(async () => {
    await platform.Platform.shutdown();
  });

  test('starts service', async () => {
    const service = platform.Platform.get('MyService');
    assert.notEqual(service, undefined);
  });
});
```

## Isolated runtimes

`Platform.run` uses one default runtime per process. To run more than one platform in a test, or to keep a test's services away from everything else in the process, create a runtime:

```ts
let runtime: platform.PlatformRuntime;

before(async () => {
  runtime = platform.Platform.create();
  await runtime.run('./tests/my-platform.yml');
});

after(async () => {
  await runtime.shutdown();
});

test('only this runtime has the service', () => {
  assert.equal(runtime.has('MyService'), true);
  assert.equal(platform.Platform.create().has('MyService'), false);
});
```

Services, service clients, HTTP callbacks and OpenAPI resolve through the runtime that owns them. Timers, queue consumers and flow continuations aren't fully runtime-isolated yet, so prefer one runtime per test file when you use them.

## Check what's running

`Platform.inspect()` describes the running platform. Assert on it instead of reaching into services:

```ts
const manifest = platform.Platform.inspect();
const book = manifest.services
  .find((service) => service.serviceName === 'AppointmentsService')
  ?.handlers.find((handler) => handler.name === 'bookAppointment');

assert.deepEqual((book?.inputSchema as any).required, ['name', 'phone', 'at']);
assert.ok(manifest.providers.some((provider) => provider.id === 'sms::memory::default'));
```

## Contracts

Handler contracts are enforced, so invalid input is part of the public behavior. Test it through HTTP or JSON-RPC:

```ts
const response = await fetch('http://127.0.0.1:3000/bookAppointment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Bob', at: 'tomorrow' })
});
assert.equal(response.status, 400);
assert.equal((await response.json()).title, 'INVALID_INPUT');
```

## Connectors

Use the provider's memory type, such as `slack-memory`. Read what the app sent with its `outbox` operation, and play the provider with `inject`. Injected events go through the same queue, routes, retries and dead letters as real ones.

## What to test with full platform runs

- HTTP route wiring
- MQ route wiring
- email/SMS delegate behavior
- service-to-service calls
- discovery and registry resolution
- coordinator-backed singleton timers
- idempotency duplicate suppression
- connector events, retries and dead letters
- MCP tools and ontology endpoints
- workload identity between processes

## Multi-process tests

For distributed behavior, run separate platform processes or spawn child processes with separate YAML files.

Useful scenarios:

- registry server + provider + consumer
- coordinator server + duplicate timer workers
- remote service provider + consumer

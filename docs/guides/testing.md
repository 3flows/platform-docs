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

## What to test with full platform runs

- HTTP route wiring
- MQ route wiring
- email/SMS delegate behavior
- service-to-service calls
- discovery and registry resolution
- coordinator-backed singleton timers
- idempotency duplicate suppression

## Multi-process tests

For distributed behavior, run separate platform processes or spawn child processes with separate YAML files.

Useful scenarios:

- registry server + provider + consumer
- coordinator server + duplicate timer workers
- remote service provider + consumer

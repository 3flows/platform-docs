# Email and SMS idempotency

Email and SMS providers can retry delivery or expose the same message more than once. The platform can skip duplicates when `idempotencies.DEFAULT` exists.

## Email example

```yaml
services:
  - name: InboundEmailService

idempotencies:
  - name: DEFAULT
    type: memory

emails:
  - name: DEFAULT
    type: memory
    services:
      - name: InboundEmailService
```

```ts
route.email().to('support@example.com').anySubject().do(async (params, trigger) => {
  const message = trigger.context.emailContext?.message;
});
```

Default key:

```txt
email:<route>:<message.id>
```

## SMS example

```yaml
services:
  - name: InboundSMSService

idempotencies:
  - name: DEFAULT
    type: memory

smss:
  - name: DEFAULT
    type: memory
    services:
      - name: InboundSMSService
```

```ts
route.sms().anyFrom().to('+15550000001').do(async (params, trigger) => {
  const message = trigger.context.smsContext?.message;
});
```

Default key:

```txt
sms:<route>:<message.id>
```

## Without idempotency

If no `idempotencies.DEFAULT` store exists, duplicate email and SMS messages are processed normally.

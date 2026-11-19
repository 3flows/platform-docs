# `pipelines` and `flows`

Pipelines and flows are services. These sections start them, and `flows` also says where flow runs are kept.

```yaml
pipelines:
  register:
    - name: AppointmentImportPipeline
    - name: PracticeSyncPipeline

flows:
  state:
    type: doc
    db: datahub
    collection: flow_runs
  register:
    - name: ReferralFlow
```

Registered pipelines and flows behave like entries in `services`. Their HTTP triggers are exposed through `https`, and their queue triggers are attached through `mqs.use`:

```yaml
https:
  - name: api
    port: 3000
    services:
      - name: AppointmentImportPipeline
        basepath: /data/imports
      - name: ReferralFlow
        basepath: /data/flows

mqs:
  - name: DEFAULT
    type: memory
    use:
      - CrmCustomersPipeline
```

Timer triggers declared with `.on.timer(cron)` start and stop with the pipeline or flow. They don't need a `timers` entry, and they use the same ownership defaults as YAML timers.

## `pipelines`

| Field | Description |
|---|---|
| `register` | Pipelines to start. Same fields as an entry in `services` |

## `flows`

| Field | Description |
|---|---|
| `register` | Flows to start. Same fields as an entry in `services` |
| `state.type` | `doc`: runs are kept in the `docs` store |
| `state.use` | Name of the `docs` store. Defaults to `DEFAULT` |
| `state.db` | Database of the runs |
| `state.collection` | Collection of the runs. Waiting runs are also indexed in `<collection>_waits` |

A flow can override where its runs are written with `.state().doc().db(...).collection(...)`. Resuming always reads from `flows.state`, so flows that wait should use it. Without any state, a flow still runs and reports, but it can't be resumed after a wait.

Resume a waiting flow from any service with the `flows` service:

```ts
await Platform.get<Flows>('flows').resume({ event: 'referrals.reviewed', correlation: runId, payload: { accepted: true } });
```

In a process with more than one runtime, `trigger.context.platform().get<Flows>('flows')` reaches the `flows` service of the runtime that owns the handler.

## Steps

Every step of a flow accepts the same modifiers:

| Modifier | Effect |
|---|---|
| `.retry({ attempts, backoffMs })` | Runs a failing step again |
| `.skipWhen(predicate, reason?)` | Skips the step when the predicate is true. The report shows it as `skipped`, with the reason |
| `.recover((error, ctx) => value)` | Runs when the step has failed for good. Its result becomes the step's result, and the flow goes on |
| `.metadata({ … })` | Free-form data that is copied into the step's report |

`.when(name, predicate)` … `.otherwise()` … `.end()` branches. Steps of the branch that wasn't taken are reported as `skipped`.

`ctx.variables` is a place for values that later steps need. It's part of the report (`report.variables`) and is restored when a waiting flow resumes.

## Running a flow from code

A flow normally starts from its trigger. Code that holds the flow can run it directly, watch it, and cancel it:

```ts
const flow = Platform.get<ReferralFlow>('ReferralFlow');
const controller = new AbortController();

const report = await flow.run(
    { input: batch, signal: controller.signal },
    { onEvent: (event) => console.log(event.type) }
);
```

| Part | Description |
|---|---|
| `onEvent` | Called with `flow.started`, `step.started`, `step.succeeded`, `step.failed`, `step.skipped`, `step.recovered`, `flow.waiting`, `flow.succeeded`, `flow.failed` and `flow.cancelled`. Every event carries the report so far |
| `eventFailureMode` | `best-effort` (default): an `onEvent` that throws doesn't affect the run. `strict`: it fails the run |
| `signal` | Aborting it cancels the run. `run` rejects with a `FlowCancelledError` whose `report` has the status `cancelled` and the signal's reason in `cancelledReason` |

`Flows.resume(input, options)` accepts the same options.

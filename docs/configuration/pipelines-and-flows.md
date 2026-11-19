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

Resume a waiting flow from any service with the `flows` service. Prefer the owning runtime or trigger context in application code:

```ts
await trigger.context.platform().get<Flows>('flows').resume({
  event: 'referrals.reviewed',
  correlation: runId,
  payload: { accepted: true }
});
```

## Runtime events and cancellation

Flows can report lifecycle events while they run:

```ts
const report = await ReferralFlow.run(input, {
  onEvent: (event) => log.info(event)
});
```

Event delivery is best-effort by default. Use strict event delivery when monitoring/audit code must be part of the run outcome. Flow runs also accept `AbortSignal` cancellation; cancelled runs report a `FlowCancelledError`, including the abort reason when one is provided.

Flow variables are persisted into `FlowReport.variables` and restored across wait/resume state, so long-running flows can carry explicit state without hiding it in ad-hoc documents.

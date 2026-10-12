---
name: jobs-define-job
description: Add or migrate background jobs with defineJob, register them in jobLoaders, and dispatch via job.dispatch/dispatchBatch instead of qstash.publishJSON to a cron URL. Use when adding a QStash worker, converting a POST /api/cron route into a job, or when the user mentions defineJob, job handlers, /api/jobs/process, or background jobs.
---

# Background jobs: use defineJob

Payload-driven QStash work goes through `defineJob`. Do **not** add a new HTTP route under `/api/jobs` — every job is executed by the existing [`apps/web/app/api/jobs/process/[jobName]/route.ts`](apps/web/app/api/jobs/process/[jobName]/route.ts).

Keep using `withCron` for Vercel GET schedules and for cron scanners that have no job envelope. See the `cron-use-with-cron` skill for those.

## File layout

```
apps/web/lib/jobs/
├── index.ts                 # defineJob — do not edit unless changing the framework
├── registry.ts              # jobLoaders — register every new job here
├── send-jobs.ts             # envelope + QStash request builder
└── handlers/
    └── {name}-job.ts        # one file per job
```

## 1. Create the handler

Add `apps/web/lib/jobs/handlers/{name}-job.ts`. The `name` must be kebab-case and end in `-job` (enforced by `jobNameSchema`: `/^[a-z][a-z0-9]*(-[a-z0-9]+)*-job$/`).

```ts
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

export const unbanPartnerJob = defineJob({
  name: "unban-partner-job",
  schema: inputSchema,
  defaults: {
    retries: 3, // optional; QStash retries on 5xx
    // queue: "unban-partner", // optional; named QStash queue
    // flowControl: { key: "unban-partner", parallelism: 20 },
  },
  async handle(input) {
    // skip (permanent / not found) → return (process route returns 2xx, QStash does not retry)
    // transient failure → throw (process route returns 500, QStash retries)
  },
});
```

Export the const as camelCase `{name}Job` matching the kebab `name`.

Reference handlers:

- Simple skip/work: `unban-partner-job.ts`, `create-tremendous-campaign-job.ts`
- Self-pagination: `folder-deleted-job.ts`, `domain-deleted-job.ts`, `partner-search-sync-job.ts`
- `defaults.flowControl`: `partner-search-sync-job.ts`

## 2. Register it

Add a **static** `import()` in [`apps/web/lib/jobs/registry.ts`](apps/web/lib/jobs/registry.ts) `jobLoaders`. The object key must equal `defineJob({ name })`. Webpack code-splits each handler.

```ts
"unban-partner-job": () =>
  import("./handlers/unban-partner-job").then((m) => m.unbanPartnerJob),
```

Do not register by editing the process route. `loadJob` throws if `job.name !==` the registry key.

## 3. Dispatch from call sites

Import the handler (not `qstash`) and call `dispatch` / `dispatchBatch`:

```ts
import { unbanPartnerJob } from "@/lib/jobs/handlers/unban-partner-job";

await unbanPartnerJob.dispatch(
  { workspaceId, programId, partnerId },
  { label: partnerId },
);

await folderDeletedJob.dispatchBatch(
  folderIds.map((folderId) => ({ folderId })),
  ({ folderId }) => ({ label: folderId }),
);
```

Per-dispatch options merge over `defaults`: `delay`, `notBefore`, `deduplicationId`, `retries`, `queue`, `flowControl`, `label`.

Failed QStash publish is persisted to the jobs outbox automatically — do not catch-and-swallow unless even the outbox persist failing must not fail the source mutation (see `queue-partner-search-sync.ts`).

Self-pagination: call `theJob.dispatch(nextPayload, { delay: 1 })` from `handle` (see `folder-deleted-job`, `partner-search-sync-job`).

Do not call `job.execute` from app code. That is only for the process route (and cron drain shims below).

## 4. Convert an existing cron worker

1. Move the `withCron` body into `handle`. Replace `logAndRespond("skip…")` with `console.info` / `console.error` + `return`.
2. Register + switch every `qstash.publishJSON` / `enqueueJSON` / `enqueueBatchJobs` targeting that cron URL to `job.dispatch` / `dispatchBatch`.
3. Keep a thin POST shim at the old `/api/cron/...` URL that parses the **old** body (not the job envelope) and calls `job.execute(payload)`. That drains in-flight QStash messages. Do not add a shim for brand-new jobs.
4. Delete cron-only helpers that moved with the handler.

## Handle semantics

| Outcome | What to do | HTTP from process route | QStash |
| --- | --- | --- | --- |
| Work done | `return` | 200 | stop |
| Skip (not found, already done, env not configured) | `console.*` + `return` | 200 | stop |
| Bad payload | throw `ZodError` (schema.parse) | 200 | stop (non-retryable) |
| Transient failure | `throw` | 500 | retry |

Unknown job names and invalid envelopes also return 2xx so QStash does not retry forever.

## Do not use defineJob for

- Vercel GET crons in `apps/web/vercel.json`
- Scanners that only fan out work (the worker they enqueue can be a job)
- Importers that republish continuation state to the same URL
- `/api/cron/queue/retry` (job replay infrastructure)
- Path-param identity (`/api/cron/links/[linkId]/…`) unless the id moves into the payload
- Outbound webhook forwarding and postbacks

## Do not

- Add a new `/api/jobs/...` route or a new `/api/cron/...` POST worker for payload-driven work.
- Call `qstash.publishJSON` / `enqueueJSON` / `enqueueBatchJobs` with `/api/jobs/process/...` — use `dispatch`.
- Register jobs with a dynamic `import()` that webpack cannot statically analyze, or a key that differs from `defineJob({ name })`.
- Name a job without the `-job` suffix.
- Use `job.execute` at dispatch call sites.
- Run `pnpm build` after adding a job.

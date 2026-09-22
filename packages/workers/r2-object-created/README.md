# r2-object-created Worker (thin forwarder)

Cloudflare Queue **push** consumer that forwards each R2 `object-create` notification to Next.js. Magic-byte validation, quarantine bucket move, and Axiom logging run in the app.

## Quick Edit

1. Paste [`worker.js`](./worker.js) into Workers Quick Edit → Deploy.
2. Settings → Bindings / Variables / Secrets (below).
3. Confirm public R2 bucket **Event notification** `object-create` → matching queue.

## Bindings

| Type              | Name                               | Value                                              |
| ----------------- | ---------------------------------- | -------------------------------------------------- |
| Queues (consumer) | —                                  | `r2-object-created` or `-dev`                      |
| Variable          | `DUB_WEBHOOK_URL`                  | `https://<host>/api/webhooks/r2-object-created`    |
| Secret            | `CLOUDFLARE_WORKER_WEBHOOK_SECRET` | Same as Next.js `CLOUDFLARE_WORKER_WEBHOOK_SECRET` |

No R2 or Axiom bindings on the Worker — Next.js uses `STORAGE_*` and Axiom already.

## Quarantine bucket

Mismatched uploads are copied (same key) into the R2 bucket named by `STORAGE_QUARANTINE_BUCKET` in [`apps/web/lib/storage.ts`](../../../apps/web/lib/storage.ts), then deleted from the public bucket.

- Constant value: `quarantine`
- Create an R2 bucket with that exact name in the **same account and jurisdiction** as the public bucket (so `CopyObject` works).
- Grant the storage API token Object Read & Write on public + `quarantine` (and private if needed).

## Flow

```text
R2 object-create → Queue → Worker → POST /api/webhooks/r2-object-created
  → magic-byte check → copy same key to `quarantine` bucket → delete public → Axiom
```

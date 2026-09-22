# r2-object-created Worker (thin forwarder)

Cloudflare Queue **push** consumer that forwards each R2 `object-create` notification to Next.js. Magic-byte validation, delete-on-mismatch, and Axiom logging run in the app.

## Quick Edit

1. Paste [`worker.js`](./worker.js) into Workers Quick Edit → Deploy.
2. Settings → Bindings / Variables / Secrets (below).
3. Confirm public R2 bucket **Event notification** `object-create` → matching queue.

## Bindings

| Type              | Name                               | Value                                                     |
| ----------------- | ---------------------------------- | --------------------------------------------------------- |
| Queues (consumer) | —                                  | `r2-object-created` or `-dev`                             |
| Variable          | `DUB_WEBHOOK_URL`                  | `https://<host>/api/cloudflare/webhook/r2-object-created` |
| Secret            | `CLOUDFLARE_WORKER_WEBHOOK_SECRET` | Same as Next.js `CLOUDFLARE_WORKER_WEBHOOK_SECRET`        |

No R2 or Axiom bindings on the Worker — Next.js uses `STORAGE_*` and Axiom already.

## Flow

```text
R2 object-create → Queue → Worker → POST /api/cloudflare/webhook/r2-object-created
  → magic-byte check → delete public object on mismatch → Axiom
```

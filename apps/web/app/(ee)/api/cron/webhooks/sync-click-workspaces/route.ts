import { withCron } from "@/lib/cron/with-cron";
import { rebuildClickWebhookWorkspaces } from "@/lib/webhook/click-webhook-workspaces";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/webhooks/sync-click-workspaces
// Rebuild the Redis set of workspaces with active link.clicked webhooks.
// Runs every minute (* * * * *)
export const GET = withCron(async () => {
  const count = await rebuildClickWebhookWorkspaces();

  return logAndRespond(
    count === 0
      ? "No workspaces with link.clicked webhooks found. Cleared cache."
      : `Synced ${count} workspace(s) with link.clicked webhooks.`,
  );
});

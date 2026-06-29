import { withCron } from "@/lib/cron/with-cron";
import {
  promoteLinkWebhooksForClick,
  syncClickWebhookWorkspaceSet,
} from "@/lib/webhook/click-webhook-workspaces";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/webhooks/sync-click-workspaces
// Rebuild the Redis set of workspaces with active link.clicked webhooks.
// Runs every minute (* * * * *)
export const GET = withCron(async () => {
  const promoted = await promoteLinkWebhooksForClick();

  const synced = await syncClickWebhookWorkspaceSet();

  return logAndRespond(
    `Synced ${synced} workspace(s) with link.clicked webhooks. Promoted ${promoted} webhooks for click.`,
  );
});

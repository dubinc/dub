import { withCron } from "@/lib/cron/with-cron";
import { logAndRespond } from "../../utils";
import {
  cleanupRedundantLinkWebhookEntries,
  syncClickWebhookWorkspaceSet,
} from "./utils";

export const dynamic = "force-dynamic";

// GET /api/cron/webhooks/sync-click-workspaces
// Rebuild the Redis set of workspaces with active link.clicked webhooks.
// Runs every 5 minutes (*/5 * * * *)
export const GET = withCron(async () => {
  const synced = await syncClickWebhookWorkspaceSet();
  const deleted = await cleanupRedundantLinkWebhookEntries();

  return logAndRespond(
    `Synced ${synced} workspace(s) with link.clicked webhooks. Deleted ${deleted} redundant LinkWebhook entries.`,
  );
});

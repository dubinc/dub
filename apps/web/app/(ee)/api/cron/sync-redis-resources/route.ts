import { withCron } from "@/lib/cron/with-cron";
import { syncGoogleAdsInstalledWorkspaceSet } from "@/lib/integrations/google-ads/installed-workspaces";
import { logAndRespond } from "../utils";
import { cleanupRedundantLinkWebhookEntries } from "./cleanup-redundant-link-webhook-entries";
import { syncClickWebhookWorkspaceSet } from "./sync-click-webhook-workspace-set";

export const dynamic = "force-dynamic";

/*
    GET /api/cron/sync-redis-resources
    Rebuild various Redis resources:
    - syncClickWebhookWorkspaceSet: rebuild the Redis set of workspaces with active link.clicked webhooks
    - cleanupRedundantLinkWebhookEntries: remove redundant LinkWebhook entries for webhooks that are not scoped to links (folders, workspace)
    - syncGoogleAdsInstalledWorkspaceSet: rebuild the Redis set of workspaces with Google Ads installed
*/

// Runs every 5 minutes (*/5 * * * *)
export const GET = withCron(async () => {
  const result = await Promise.allSettled([
    syncClickWebhookWorkspaceSet(),
    cleanupRedundantLinkWebhookEntries(),
    syncGoogleAdsInstalledWorkspaceSet(),
  ]);

  [
    "syncClickWebhookWorkspaceSet",
    "cleanupRedundantLinkWebhookEntries",
    "syncGoogleAdsInstalledWorkspaceSet",
  ].map((name, index) => {
    if (result[index].status === "fulfilled") {
      console.log(`${name}: ${result[index].value}`);
    } else if (result[index].status === "rejected") {
      console.error(`${name}: ${result[index].reason}`);
    } else {
      console.error(`${name}: unknown error`);
    }
  });

  return logAndRespond("Synced Redis resources.");
});

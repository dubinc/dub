import { withCron } from "@/lib/cron/with-cron";
import { syncGoogleAdsInstalledWorkspaceSet } from "@/lib/integrations/google-ads/installed-workspaces";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/gad/sync-installed-workspaces
// Rebuild the Redis set of workspaces with Google Ads installed.
// Runs every minute (* * * * *)
export const GET = withCron(async () => {
  const synced = await syncGoogleAdsInstalledWorkspaceSet();

  return logAndRespond(
    `Synced ${synced} workspace(s) with Google Ads installed.`,
  );
});

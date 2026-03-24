import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { getFeatureFlags } from "@/lib/edge-config";
import { parseTrackedSitemaps } from "@/lib/sitemaps/import-tracked-sitemaps";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/sitemaps/queue - queue sitemap import jobs for eligible workspaces
export const GET = withCron(async () => {
  const workspaces = await prisma.project.findMany({
    select: {
      id: true,
      trackedSitemaps: true,
    },
  });

  if (workspaces.length === 0) {
    return logAndRespond("No workspaces found.");
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  let queued = 0;
  let withTrackedSitemaps = 0;
  let withFeatureFlag = 0;

  for (const workspace of workspaces) {
    const trackedSitemaps = parseTrackedSitemaps(workspace.trackedSitemaps);

    if (trackedSitemaps.length === 0) {
      continue;
    }
    withTrackedSitemaps++;

    const flags = await getFeatureFlags({
      workspaceId: workspace.id,
    });

    if (!flags.analyticsSettingsSiteVisitTracking) {
      continue;
    }
    withFeatureFlag++;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/sitemaps/import`,
      method: "POST",
      body: {
        workspaceId: workspace.id,
      },
      deduplicationId: `sitemap-import-${dayKey}-${workspace.id}`,
    });

    queued++;
  }

  return logAndRespond(
    `Queued sitemap import jobs for ${queued} workspace(s).`,
  );
});

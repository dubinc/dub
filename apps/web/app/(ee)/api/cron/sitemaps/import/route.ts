import { withCron } from "@/lib/cron/with-cron";
import { getFeatureFlags } from "@/lib/edge-config";
import {
  importTrackedSitemaps,
  parseTrackedSitemaps,
} from "@/lib/sitemaps/import-tracked-sitemaps";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  workspaceId: z.string(),
});

// POST /api/cron/sitemaps/import - crawl tracked sitemaps and create missing links
export const POST = withCron(async ({ rawBody }) => {
  const { workspaceId } = bodySchema.parse(JSON.parse(rawBody));

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      slug: true,
      trackedSitemaps: true,
    },
  });

  if (!workspace) {
    return logAndRespond(`Workspace ${workspaceId} not found. Skipping...`);
  }

  const flags = await getFeatureFlags({
    workspaceId: workspace.id,
  });

  if (!flags.analyticsSettingsSiteVisitTracking) {
    console.info("[sitemaps.cron.import] feature flag disabled", {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
    });
    return logAndRespond(
      `Workspace ${workspace.slug} does not have site visit tracking beta enabled. Skipping...`,
    );
  }

  const trackedSitemaps = parseTrackedSitemaps(workspace.trackedSitemaps);

  if (trackedSitemaps.length === 0) {
    return logAndRespond(
      `Workspace ${workspace.slug} has no tracked sitemaps configured. Skipping...`,
    );
  }

  const selectedDomain = await prisma.domain.findFirst({
    where: {
      projectId: workspace.id,
      primary: true,
      archived: false,
    },
    select: {
      slug: true,
    },
  });

  if (!selectedDomain?.slug) {
    return logAndRespond(
      `Workspace ${workspace.slug} has no primary domain configured. Skipping...`,
    );
  }

  const owner = await prisma.projectUsers.findFirst({
    where: {
      projectId: workspace.id,
      role: "owner",
    },
    select: {
      userId: true,
    },
  });

  if (!owner) {
    console.info("[sitemaps.cron.import] no workspace owner", {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
    });

    return logAndRespond(
      `Workspace ${workspace.slug} has no owner user. Skipping...`,
    );
  }

  const { linksToCreate, createdLinks, updatedTrackedSitemaps } =
    await importTrackedSitemaps({
      trackedSitemaps,
      domain: selectedDomain.slug,
      projectId: workspace.id,
      userId: owner.userId,
      skipRedisCache: true,
    });

  await prisma.project.update({
    where: {
      id: workspace.id,
    },
    data: {
      trackedSitemaps: updatedTrackedSitemaps,
    },
  });

  return logAndRespond(
    `Workspace ${workspace.slug}: found ${linksToCreate.length} new link(s), created ${createdLinks.length}.`,
  );
});

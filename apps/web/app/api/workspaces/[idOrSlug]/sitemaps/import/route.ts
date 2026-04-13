import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import {
  importTrackedSitemaps,
  parseTrackedSitemaps,
} from "@/lib/sitemaps/import-tracked-sitemaps";
import {
  getOrCreateSiteLinksFolder,
  getSiteLinksDomain,
  replaceTrackedSitemapsInColumn,
} from "@/lib/sitemaps/site-visit-tracking";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  sitemapUrl: z.string().url().optional(),
});

// POST /api/workspaces/[idOrSlug]/sitemaps/import - import tracked sitemap(s) immediately
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { sitemapUrl } = bodySchema.parse(await req.json());

    const trackedSitemaps = parseTrackedSitemaps(
      workspace.siteVisitTrackingSettings,
    );

    if (trackedSitemaps.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "No tracked sitemaps configured.",
      });
    }

    const targetTrackedSitemaps = sitemapUrl
      ? trackedSitemaps.filter((sitemap) => sitemap.url === sitemapUrl)
      : trackedSitemaps;

    if (targetTrackedSitemaps.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: "Sitemap not found in tracked sitemaps.",
      });
    }

    const rateLimitKey = `sitemap-import:${workspace.id}:${sitemapUrl ?? "all"}`;
    const { success } = await ratelimit(5, "1 m").limit(rateLimitKey);
    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "Sitemap import was requested too recently. Please wait a minute and try again.",
      });
    }

    const selectedDomain = await getSiteLinksDomain(
      workspace.id,
      workspace.siteVisitTrackingSettings,
    );

    if (!selectedDomain?.slug) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Configure a verified site links domain in site visit tracking settings.",
      });
    }

    const siteLinksFolderId = await getOrCreateSiteLinksFolder({
      projectId: workspace.id,
      userId: session.user.id,
    });

    const { linksToCreate, createdLinks, updatedTrackedSitemaps } =
      await importTrackedSitemaps({
        trackedSitemaps: targetTrackedSitemaps,
        domain: selectedDomain.slug,
        projectId: workspace.id,
        userId: session.user.id,
        folderId: siteLinksFolderId,
      });

    const updatedByUrl = new Map(
      updatedTrackedSitemaps.map((sitemap) => [sitemap.url, sitemap]),
    );

    // Re-read trackedSitemaps right before writing to avoid overwriting
    // concurrent structural edits (add/delete) that happened during the import.
    const freshWorkspace = await prisma.project.findUnique({
      where: { id: workspace.id },
      select: { siteVisitTrackingSettings: true },
    });
    const freshTrackedSitemaps = parseTrackedSitemaps(
      freshWorkspace?.siteVisitTrackingSettings,
    );

    const mergedTrackedSitemaps = freshTrackedSitemaps.map((sitemap) => {
      return updatedByUrl.get(sitemap.url) || sitemap;
    });

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        siteVisitTrackingSettings: replaceTrackedSitemapsInColumn(
          freshWorkspace?.siteVisitTrackingSettings,
          mergedTrackedSitemaps,
        ),
      },
    });

    return NextResponse.json({
      processed: targetTrackedSitemaps.length,
      found: linksToCreate.length,
      created: createdLinks.length,
    });
  },
  {
    requiredPermissions: ["workspaces.write"],
    featureFlag: "analyticsSettingsSiteVisitTracking",
  },
);

import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import {
  importTrackedSitemaps,
  parseTrackedSitemaps,
} from "@/lib/sitemaps/import-tracked-sitemaps";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  sitemapUrl: z.string().url().optional(),
});

// POST /api/workspaces/[idOrSlug]/sitemaps/import - import tracked sitemap(s) immediately
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { sitemapUrl } = bodySchema.parse(await req.json());

    const trackedSitemaps = parseTrackedSitemaps(workspace.trackedSitemaps);

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
      throw new DubApiError({
        code: "bad_request",
        message: "Primary domain not configured.",
      });
    }

    const { linksToCreate, createdLinks, updatedTrackedSitemaps } =
      await importTrackedSitemaps({
        trackedSitemaps: targetTrackedSitemaps,
        domain: selectedDomain.slug,
        projectId: workspace.id,
        userId: session.user.id,
        skipRedisCache: true,
      });

    const updatedByUrl = new Map(
      updatedTrackedSitemaps.map((sitemap) => [sitemap.url, sitemap]),
    );

    // Re-read trackedSitemaps right before writing to avoid overwriting
    // concurrent structural edits (add/delete) that happened during the import.
    const freshWorkspace = await prisma.project.findUnique({
      where: { id: workspace.id },
      select: { trackedSitemaps: true },
    });
    const freshTrackedSitemaps = parseTrackedSitemaps(
      freshWorkspace?.trackedSitemaps,
    );

    const mergedTrackedSitemaps = freshTrackedSitemaps.map((sitemap) => {
      return updatedByUrl.get(sitemap.url) || sitemap;
    });

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        trackedSitemaps:
          mergedTrackedSitemaps as unknown as Prisma.InputJsonValue,
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

import { createId } from "@/lib/api/create-id";
import {
  siteVisitTrackingSettingsValueSchema,
  trackedSitemapSchema,
} from "@/lib/zod/schemas/site-visit-tracking";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import type { z } from "zod/v4";
import * as zod from "zod/v4";

// -----------------------------------------------------------------------------
// Site visit tracking settings (`Project.siteVisitTrackingSettings` JSON)
// -----------------------------------------------------------------------------

export type TrackedSitemap = z.infer<typeof trackedSitemapSchema>;

export type SiteVisitTrackingSettingsValue = z.infer<
  typeof siteVisitTrackingSettingsValueSchema
>;

/** Per-item parse so one bad row does not drop the whole list. */
function parseTrackedSitemapsArrayLoose(arr: unknown): TrackedSitemap[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  const result: TrackedSitemap[] = [];

  for (const item of arr) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const raw = item as Record<string, unknown>;
    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    if (!url) {
      continue;
    }

    const candidate: {
      url: string;
      lastCrawledAt?: string;
      lastUrlCount?: number;
    } = { url };

    if (typeof raw.lastCrawledAt === "string") {
      candidate.lastCrawledAt = raw.lastCrawledAt;
    }
    if (typeof raw.lastUrlCount === "number") {
      candidate.lastUrlCount = raw.lastUrlCount;
    }

    const parsed = trackedSitemapSchema.safeParse(candidate);
    if (parsed.success) {
      result.push(parsed.data);
    }
  }

  return result;
}

export function parseSiteVisitTrackingSettings(
  value: unknown,
): SiteVisitTrackingSettingsValue {
  if (value === null || value === undefined) {
    return { trackedSitemaps: [] };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { trackedSitemaps: [] };
  }

  const o = value as Record<string, unknown>;
  const trackedSitemaps = parseTrackedSitemapsArrayLoose(o.trackedSitemaps);

  const merged = {
    trackedSitemaps,
    ...(typeof o.siteDomainSlug === "string"
      ? { siteDomainSlug: o.siteDomainSlug }
      : {}),
    ...(typeof o.siteLinksFolderId === "string"
      ? { siteLinksFolderId: o.siteLinksFolderId }
      : {}),
  };

  const parsed = siteVisitTrackingSettingsValueSchema.safeParse(merged);
  return parsed.success ? parsed.data : { trackedSitemaps };
}

export function parseTrackedSitemaps(value: unknown): TrackedSitemap[] {
  return parseSiteVisitTrackingSettings(value).trackedSitemaps;
}

export function mergeSiteVisitTrackingSettings(
  existing: unknown,
  patch: {
    trackedSitemaps?: TrackedSitemap[] | null;
    siteDomainSlug?: string | null;
    siteLinksFolderId?: string | null;
  } | null,
): SiteVisitTrackingSettingsValue | null {
  if (patch === null) {
    return null;
  }

  const base = parseSiteVisitTrackingSettings(existing);

  const trackedSitemaps =
    patch.trackedSitemaps !== undefined && patch.trackedSitemaps !== null
      ? patch.trackedSitemaps
      : base.trackedSitemaps;

  const siteDomainSlug =
    patch.siteDomainSlug !== undefined
      ? patch.siteDomainSlug ?? undefined
      : base.siteDomainSlug;

  const siteLinksFolderId =
    patch.siteLinksFolderId !== undefined
      ? patch.siteLinksFolderId ?? undefined
      : base.siteLinksFolderId;

  const out: SiteVisitTrackingSettingsValue = { trackedSitemaps };
  if (siteDomainSlug) {
    out.siteDomainSlug = siteDomainSlug;
  }
  if (siteLinksFolderId) {
    out.siteLinksFolderId = siteLinksFolderId;
  }
  return out;
}

export function replaceTrackedSitemapsInColumn(
  existing: unknown,
  trackedSitemaps: TrackedSitemap[],
): SiteVisitTrackingSettingsValue {
  const base = parseSiteVisitTrackingSettings(existing);
  return {
    ...base,
    trackedSitemaps,
  };
}

export const workspaceSiteVisitTrackingSettingsFieldSchema = zod.preprocess(
  (v) =>
    v === null || v === undefined ? null : parseSiteVisitTrackingSettings(v),
  zod.union([siteVisitTrackingSettingsValueSchema, zod.null()]),
);

// -----------------------------------------------------------------------------
// Verified domain for sitemap-import short links
// -----------------------------------------------------------------------------

export async function findVerifiedSiteLinksDomain(
  projectId: string,
  siteVisitTrackingSettings: unknown,
) {
  const { siteDomainSlug } = parseSiteVisitTrackingSettings(
    siteVisitTrackingSettings,
  );

  if (!siteDomainSlug) {
    return null;
  }

  return prisma.domain.findFirst({
    where: {
      projectId,
      slug: siteDomainSlug,
      archived: false,
      verified: true,
    },
    select: {
      slug: true,
    },
  });
}

// -----------------------------------------------------------------------------
// "Site Links" folder for imported links
// -----------------------------------------------------------------------------

export const SITE_LINKS_FOLDER_NAME = "Site Links";

export async function getOrCreateSiteLinksFolder({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { siteVisitTrackingSettings: true },
  });

  const columnSettings = parseSiteVisitTrackingSettings(
    project?.siteVisitTrackingSettings,
  );
  const storedFolderId = columnSettings.siteLinksFolderId;

  if (storedFolderId) {
    const existingById = await prisma.folder.findFirst({
      where: {
        id: storedFolderId,
        projectId,
      },
      select: { id: true },
    });

    if (existingById) {
      return existingById.id;
    }
  }

  const newFolderId = createId({ prefix: "fold_" });

  const folder = await prisma.folder.upsert({
    where: {
      name_projectId: {
        name: SITE_LINKS_FOLDER_NAME,
        projectId,
      },
    },
    update: {},
    create: {
      id: newFolderId,
      name: SITE_LINKS_FOLDER_NAME,
      projectId,
      accessLevel: "write",
      users: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
  });

  const merged = mergeSiteVisitTrackingSettings(
    project?.siteVisitTrackingSettings,
    { siteLinksFolderId: folder.id },
  );

  if (!merged) {
    return folder.id;
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      siteVisitTrackingSettings: merged as Prisma.InputJsonValue,
    },
  });

  return folder.id;
}

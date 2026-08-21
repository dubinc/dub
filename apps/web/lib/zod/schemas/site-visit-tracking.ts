import * as z from "zod/v4";

export const trackedSitemapSchema = z.object({
  url: z.url().refine((v) => v.startsWith("https://"), {
    message: "Only HTTPS sitemap URLs are allowed.",
  }),
  lastCrawledAt: z.string().optional(),
  lastUrlCount: z.number().int().nonnegative().optional(),
});

/** Max tracked sitemap sources per workspace (enforced on PATCH). */
export const MAX_TRACKED_SITEMAPS_PER_WORKSPACE = 10;

export const siteVisitTrackingSettingsValueSchema = z.object({
  trackedSitemaps: z
    .array(trackedSitemapSchema)
    .max(MAX_TRACKED_SITEMAPS_PER_WORKSPACE)
    .default([]),
  siteDomainSlug: z.string().optional(),
  siteLinksFolderId: z.string().optional(),
});

export const siteVisitTrackingSettingsPatchSchema = z
  .object({
    trackedSitemaps: z
      .array(trackedSitemapSchema)
      .max(MAX_TRACKED_SITEMAPS_PER_WORKSPACE)
      .nullable()
      .optional(),
    siteDomainSlug: z.string().nullable().optional(),
    siteLinksFolderId: z.string().nullable().optional(),
  })
  .partial();

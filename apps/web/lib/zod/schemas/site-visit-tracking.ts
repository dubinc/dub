import * as z from "zod/v4";

export const trackedSitemapSchema = z.object({
  url: z.string().url(),
  lastCrawledAt: z.string().optional(),
  lastUrlCount: z.number().int().nonnegative().optional(),
});

export const siteVisitTrackingSettingsValueSchema = z.object({
  trackedSitemaps: z.array(trackedSitemapSchema).default([]),
  siteDomainSlug: z.string().optional(),
  siteLinksFolderId: z.string().optional(),
});

export const siteVisitTrackingSettingsPatchSchema = z
  .object({
    trackedSitemaps: z.array(trackedSitemapSchema).nullable().optional(),
    siteDomainSlug: z.string().nullable().optional(),
    siteLinksFolderId: z.string().nullable().optional(),
  })
  .partial();

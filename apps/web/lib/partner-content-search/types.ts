import type { PlatformType } from "@dub/prisma/client";

export const PARTNER_CONTENT_SEARCH_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
] as const satisfies readonly PlatformType[];

export type PartnerContentPlatform =
  (typeof PARTNER_CONTENT_SEARCH_PLATFORMS)[number];

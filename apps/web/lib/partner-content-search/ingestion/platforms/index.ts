import "server-only";

import type { PartnerContentPlatform } from "@/lib/partner-content-search/types";
import { instagramPartnerContentService } from "./instagram";
import type { PartnerContentPlatformServiceRegistry } from "./types";
import { tiktokPartnerContentService } from "./tiktok";
import { youtubePartnerContentService } from "./youtube";

export const partnerContentPlatformServices = {
  youtube: youtubePartnerContentService,
  tiktok: tiktokPartnerContentService,
  instagram: instagramPartnerContentService,
} satisfies PartnerContentPlatformServiceRegistry;

export function fetchRecentPlatformContent({
  platform,
  platformId,
  identifier,
}: {
  platform: PartnerContentPlatform;
  platformId?: string;
  identifier: string;
}) {
  return partnerContentPlatformServices[platform].fetchRecentContent({
    platformId,
    identifier,
  });
}

export function fetchPlatformTranscriptSegments({
  platform,
  url,
}: {
  platform: PartnerContentPlatform;
  url: string;
}) {
  return partnerContentPlatformServices[platform].fetchTranscript({ url });
}

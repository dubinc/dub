import "server-only";

import { getTikTokProfileVideos } from "@/lib/api/scrape-creators/get-tiktok-profile-videos";
import { getTikTokVideoTranscript } from "@/lib/api/scrape-creators/get-tiktok-video-transcript";
import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import {
  type NormalizedPartnerContentItem,
  normalizeTikTokProfileVideo,
  normalizeTikTokTranscriptSegments,
} from "@/lib/partner-content-search/ingestion/normalize-content";
import type { PartnerContentPlatformService } from "./types";
import {
  getOldestPublishedAt,
  getRecencyCutoff,
  MAX_CONTENT_PAGES,
  normalizeSocialHandle,
} from "./utils";

export const tiktokPartnerContentService: PartnerContentPlatformService = {
  async fetchRecentContent({ platformId: userId, identifier }) {
    const maxItems =
      PARTNER_CONTENT_SEARCH_LIMITS.contentItemsPerPartnerPlatform;
    const recencyCutoff = getRecencyCutoff();
    const contentItems: NormalizedPartnerContentItem[] = [];
    const handle = normalizeSocialHandle(identifier);
    let maxCursor: string | undefined;
    let page = 0;

    while (contentItems.length < maxItems && page < MAX_CONTENT_PAGES) {
      const response = await getTikTokProfileVideos({
        handle,
        userId,
        maxCursor,
      });

      const normalizedVideos = response.aweme_list
        .map((video) => normalizeTikTokProfileVideo(video, handle))
        .filter((item): item is NormalizedPartnerContentItem => item !== null);

      const recentVideos = normalizedVideos.filter(
        ({ publishedAt }) => !publishedAt || publishedAt >= recencyCutoff,
      );

      contentItems.push(...recentVideos);

      const oldestPublishedAt = getOldestPublishedAt(normalizedVideos);

      if (
        !response.max_cursor ||
        response.has_more === false ||
        (oldestPublishedAt && oldestPublishedAt < recencyCutoff)
      ) {
        break;
      }

      maxCursor = response.max_cursor ?? undefined;
      page++;
    }

    return contentItems.slice(0, maxItems);
  },

  async fetchTranscript({ url }) {
    const transcriptResponse = await getTikTokVideoTranscript({ url });
    return normalizeTikTokTranscriptSegments(transcriptResponse.transcript);
  },
};

import "server-only";

import { getYouTubeChannelVideos } from "@/lib/api/scrape-creators/get-youtube-channel-videos";
import { getYouTubeVideoTranscript } from "@/lib/api/scrape-creators/get-youtube-video-transcript";
import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import {
  type NormalizedPartnerContentItem,
  normalizeYouTubeChannelVideo,
  normalizeYouTubeTranscriptSegments,
} from "@/lib/partner-content-search/ingestion/normalize-content";
import type { PartnerContentPlatformService } from "./types";
import {
  getOldestPublishedAt,
  getRecencyCutoff,
  MAX_CONTENT_PAGES,
  normalizeSocialHandle,
} from "./utils";

export const youtubePartnerContentService: PartnerContentPlatformService = {
  async fetchRecentContent({ platformId: channelId, identifier }) {
    const maxItems =
      PARTNER_CONTENT_SEARCH_LIMITS.contentItemsPerPartnerPlatform;
    const recencyCutoff = getRecencyCutoff();
    const contentItems: NormalizedPartnerContentItem[] = [];
    const handle = channelId ? undefined : normalizeSocialHandle(identifier);
    let continuationToken: string | undefined;
    let page = 0;

    while (contentItems.length < maxItems && page < MAX_CONTENT_PAGES) {
      const response = await getYouTubeChannelVideos({
        ...(channelId ? { channelId } : { handle: handle! }),
        continuationToken,
        includeExtras: false,
      });

      const normalizedVideos = response.videos
        .map(normalizeYouTubeChannelVideo)
        .filter((item): item is NormalizedPartnerContentItem => item !== null);

      const recentVideos = normalizedVideos.filter(
        ({ publishedAt }) => !publishedAt || publishedAt >= recencyCutoff,
      );

      contentItems.push(...recentVideos);

      const oldestPublishedAt = getOldestPublishedAt(normalizedVideos);

      if (
        !response.continuationToken ||
        (oldestPublishedAt && oldestPublishedAt < recencyCutoff)
      ) {
        break;
      }

      continuationToken = response.continuationToken ?? undefined;
      page++;
    }

    return contentItems.slice(0, maxItems);
  },

  async fetchTranscript({ url }) {
    const transcriptResponse = await getYouTubeVideoTranscript({ url });
    return normalizeYouTubeTranscriptSegments(transcriptResponse.transcript);
  },
};

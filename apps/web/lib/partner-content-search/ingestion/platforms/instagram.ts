import "server-only";

import { getInstagramMediaTranscript } from "@/lib/api/scrape-creators/get-instagram-media-transcript";
import { getInstagramUserPosts } from "@/lib/api/scrape-creators/get-instagram-user-posts";
import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import {
  type NormalizedPartnerContentItem,
  normalizeInstagramTranscriptSegments,
  normalizeInstagramUserPost,
} from "@/lib/partner-content-search/ingestion/normalize-content";
import type { PartnerContentPlatformService } from "./types";
import {
  getOldestPublishedAt,
  getRecencyCutoff,
  MAX_CONTENT_PAGES,
  normalizeSocialHandle,
} from "./utils";

export const instagramPartnerContentService: PartnerContentPlatformService = {
  async fetchRecentContent({ identifier }) {
    const maxItems =
      PARTNER_CONTENT_SEARCH_LIMITS.contentItemsPerPartnerPlatform;
    const recencyCutoff = getRecencyCutoff();
    const contentItems: NormalizedPartnerContentItem[] = [];
    const handle = normalizeSocialHandle(identifier);
    let nextMaxId: string | undefined;
    let page = 0;

    while (contentItems.length < maxItems && page < MAX_CONTENT_PAGES) {
      const response = await getInstagramUserPosts({
        handle,
        nextMaxId,
      });

      const normalizedPosts = response.items
        .map(normalizeInstagramUserPost)
        .filter((item): item is NormalizedPartnerContentItem => item !== null);

      const recentPosts = normalizedPosts.filter(
        ({ publishedAt }) => !publishedAt || publishedAt >= recencyCutoff,
      );

      contentItems.push(...recentPosts);

      const oldestPublishedAt = getOldestPublishedAt(normalizedPosts);

      if (
        !response.next_max_id ||
        response.more_available === false ||
        (oldestPublishedAt && oldestPublishedAt < recencyCutoff)
      ) {
        break;
      }

      nextMaxId = response.next_max_id ?? undefined;
      page++;
    }

    return contentItems.slice(0, maxItems);
  },

  async fetchTranscript({ url }) {
    const transcriptResponse = await getInstagramMediaTranscript({ url });
    return normalizeInstagramTranscriptSegments(transcriptResponse);
  },
};

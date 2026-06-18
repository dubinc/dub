import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import type { NormalizedPartnerContentItem } from "@/lib/partner-content-search/ingestion/normalize-content";

export const MAX_CONTENT_PAGES = 3;

export function normalizeSocialHandle(handle: string) {
  return handle.replace(/^@/, "");
}

export function getOldestPublishedAt(
  contentItems: NormalizedPartnerContentItem[],
) {
  return contentItems
    .map(({ publishedAt }) => publishedAt)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
}

export function getRecencyCutoff() {
  const cutoff = new Date();
  cutoff.setMonth(
    cutoff.getMonth() - PARTNER_CONTENT_SEARCH_LIMITS.recencyWindowMonths,
  );
  return cutoff;
}

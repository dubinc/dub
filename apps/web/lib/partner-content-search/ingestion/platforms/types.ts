import type { NormalizedPartnerContentItem } from "@/lib/partner-content-search/ingestion/normalize-content";
import type {
  PartnerContentPlatform,
  TranscriptSegment,
} from "@/lib/partner-content-search/types";

export type FetchRecentContentInput = {
  platformId?: string;
  identifier: string;
};

export type FetchTranscriptInput = {
  url: string;
};

export type PartnerContentPlatformService = {
  fetchRecentContent: (
    input: FetchRecentContentInput,
  ) => Promise<NormalizedPartnerContentItem[]>;
  fetchTranscript: (
    input: FetchTranscriptInput,
  ) => Promise<TranscriptSegment[]>;
};

export type PartnerContentPlatformServiceRegistry = Record<
  PartnerContentPlatform,
  PartnerContentPlatformService
>;

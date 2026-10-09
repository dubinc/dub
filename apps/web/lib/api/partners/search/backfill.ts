import {
  indexPartnerSearchEnrollments,
  type PartnerSearchIndexProgress,
} from "./index-enrollments";
import { getPartnerSearchProvider } from "./provider";
import type { PartnerSearchProvider } from "./types";

const DEFAULT_BATCH_SIZE = 500;

export type PartnerSearchBackfillProgress = PartnerSearchIndexProgress;

interface BackfillPartnerSearchOptions {
  programId: string;
  batchSize?: number;
  after?: string;
  searchProvider?: PartnerSearchProvider | null;
  onProgress?: (progress: PartnerSearchBackfillProgress) => void;
}

export async function backfillPartnerSearch({
  programId,
  batchSize = DEFAULT_BATCH_SIZE,
  after,
  searchProvider = getPartnerSearchProvider(),
  onProgress,
}: BackfillPartnerSearchOptions) {
  if (!searchProvider) {
    throw new Error("Partner search provider is not configured.");
  }

  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive integer.");
  }

  const { processed, lastDocumentId } = await indexPartnerSearchEnrollments({
    searchProvider,
    where: { programId },
    after,
    batchSize,
    onProgress,
  });

  return {
    processed,
    lastDocumentId,
  };
}

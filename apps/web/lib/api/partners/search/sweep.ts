import { indexPartnerSearchEnrollments } from "./index-enrollments";
import { getPartnerSearchProvider } from "./provider";
import type { PartnerSearchProvider } from "./types";

export const PARTNER_SEARCH_SWEEP_BATCH_SIZE = 500;

/**
 * How long one hop indexes before handing off. The job route allows 600s. The
 * budget is checked between batches, so the batch in flight runs past it.
 * Overrunning kills the hop, QStash retries the same cursor, and the pass
 * stalls silently.
 */
export const PARTNER_SEARCH_SWEEP_TIME_BUDGET_MS = 240_000;

interface SweepPartnerSearchOptions {
  after?: string;
  batchSize?: number;
  timeBudgetMs?: number;
  now?: () => number;
  searchProvider?: PartnerSearchProvider | null;
}

/**
 * Re-indexes a slice of the corpus, resuming from `after`. Everything, not a
 * timestamp filter, because a watermark misses a tag change (ProgramPartnerTag
 * has no timestamps) and a link edit (which moves neither the enrollment's
 * timestamp nor the partner's).
 */
export async function sweepPartnerSearch({
  after,
  batchSize = PARTNER_SEARCH_SWEEP_BATCH_SIZE,
  timeBudgetMs = PARTNER_SEARCH_SWEEP_TIME_BUDGET_MS,
  now,
  searchProvider = getPartnerSearchProvider(),
}: SweepPartnerSearchOptions = {}) {
  if (!searchProvider) {
    throw new Error("Partner search provider is not configured.");
  }

  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive integer.");
  }

  if (!Number.isSafeInteger(timeBudgetMs) || timeBudgetMs <= 0) {
    throw new Error("Time budget must be a positive integer.");
  }

  return await indexPartnerSearchEnrollments({
    searchProvider,
    after,
    batchSize,
    timeBudgetMs,
    ...(now && { now }),
  });
}

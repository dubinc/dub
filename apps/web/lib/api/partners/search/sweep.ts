import { indexPartnerSearchEnrollments } from "./index-enrollments";
import { getPartnerSearchProvider } from "./provider";
import type { PartnerSearchProvider } from "./types";

export const PARTNER_SEARCH_SWEEP_BATCH_SIZE = 500;

/**
 * How long one hop indexes before handing off. The job route allows 600s, and
 * the margin covers the batch in flight when the budget expires, since the
 * check happens between batches. Errs generous: overrunning kills the hop and
 * QStash retries the same cursor, stalling the pass silently.
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
 * Re-indexes a slice of the corpus, resuming from `after`. The backstop for
 * call-site drift: a mutation path that never queued a sync is corrected by the
 * next pass.
 *
 * Re-indexes everything rather than filtering by timestamp, because a watermark
 * cannot see a tag change (ProgramPartnerTag has no timestamps) or a link edit
 * (which moves neither the enrollment's nor the partner's).
 *
 * Deletions stay outside this. A pass only sees rows that still exist.
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

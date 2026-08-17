import { Prisma } from "@prisma/client";
import { indexPartnerSearchEnrollments } from "./index-enrollments";
import { getPartnerSearchProvider } from "./provider";
import type { PartnerSearchProvider } from "./types";

export const PARTNER_SEARCH_SWEEP_BATCH_SIZE = 500;

/**
 * How long one hop indexes before handing off to the next.
 *
 * The job route allows 600s, so this leaves more than half the budget spare.
 * The margin covers the batch in flight when the budget runs out, since the
 * check happens between batches and cannot interrupt one.
 *
 * Deliberately generous rather than tuned. Overrunning the route's limit kills
 * the hop, and QStash then retries the same cursor until it gives up, which
 * stalls the pass with nothing to say so. Finishing a hop early costs one extra
 * message.
 */
export const PARTNER_SEARCH_SWEEP_TIME_BUDGET_MS = 240_000;

interface SweepPartnerSearchOptions {
  after?: string;
  /**
   * Restricts the pass to enrollments touched at or after this moment.
   *
   * Deliberately not the scheduled mode. Neither ProgramEnrollment.updatedAt
   * nor Partner.updatedAt is indexed, so this filter is a scan and belongs to
   * one-shot use — most usefully the catch-up after a long backfill, which has
   * to re-index whatever changed while it was running.
   *
   * It also cannot see everything. ProgramPartnerTag carries no timestamps at
   * all, and a link edit moves neither of these columns, so a watermark pass is
   * strictly narrower than the full pass below.
   */
  since?: Date;
  batchSize?: number;
  timeBudgetMs?: number;
  now?: () => number;
  searchProvider?: PartnerSearchProvider | null;
}

function buildSweepWhere(
  since?: Date,
): Prisma.ProgramEnrollmentWhereInput | undefined {
  if (!since) {
    return undefined;
  }

  return {
    OR: [{ updatedAt: { gte: since } }, { partner: { updatedAt: { gte: since } } }],
  };
}

/**
 * Re-indexes a slice of the corpus, resuming from `after`.
 *
 * This is the backstop for call-site drift. Every hook that fires is an
 * optimization on top of it: a mutation path that forgets to queue a sync, or
 * one added later by someone who does not know the index exists, is corrected
 * by the next full pass rather than staying wrong until someone notices.
 *
 * Runs unfiltered by default, re-indexing everything rather than only what a
 * timestamp says changed. That costs writes the watermark version would skip,
 * and buys the one guarantee the watermark cannot give: no document is stale
 * for longer than a full pass, whatever drifted and whether or not the column
 * that drifted has a timestamp. Tags have none, which is what makes this the
 * only mechanism that covers them.
 *
 * Deletions stay outside this. A pass only sees rows that still exist, so an
 * orphaned document is invisible to it and is cleared by its call-site hook or
 * by rebuilding the namespace.
 */
export async function sweepPartnerSearch({
  after,
  since,
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
    where: buildSweepWhere(since),
    after,
    batchSize,
    timeBudgetMs,
    ...(now && { now }),
  });
}

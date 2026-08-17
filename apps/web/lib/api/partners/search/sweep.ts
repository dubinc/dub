import { Prisma } from "@prisma/client";
import { indexPartnerSearchEnrollments } from "./index-enrollments";
import { getPartnerSearchProvider } from "./provider";
import type { PartnerSearchProvider } from "./types";

export const PARTNER_SEARCH_SWEEP_BATCH_SIZE = 500;

/**
 * Batches per invocation. At 500 documents each this is 20K per hop, which
 * leaves room under the job route's duration limit while keeping the number of
 * hops for a full pass in the dozens rather than the thousands.
 */
export const PARTNER_SEARCH_SWEEP_MAX_BATCHES = 40;

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
  maxBatches?: number;
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
  maxBatches = PARTNER_SEARCH_SWEEP_MAX_BATCHES,
  searchProvider = getPartnerSearchProvider(),
}: SweepPartnerSearchOptions = {}) {
  if (!searchProvider) {
    throw new Error("Partner search provider is not configured.");
  }

  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive integer.");
  }

  if (!Number.isSafeInteger(maxBatches) || maxBatches <= 0) {
    throw new Error("Max batches must be a positive integer.");
  }

  return await indexPartnerSearchEnrollments({
    searchProvider,
    where: buildSweepWhere(since),
    after,
    batchSize,
    maxBatches,
  });
}

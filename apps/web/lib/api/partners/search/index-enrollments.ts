import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
} from "./serialize-document";
import type { PartnerSearchProvider } from "./types";

export interface PartnerSearchIndexProgress {
  batchSize: number;
  processed: number;
  lastDocumentId: string;
}

interface IndexPartnerSearchEnrollmentsOptions {
  searchProvider: PartnerSearchProvider;
  /**
   * Narrows what gets indexed. Must not constrain `id`, which is reserved for
   * the keyset cursor.
   */
  where?: Prisma.ProgramEnrollmentWhereInput;
  after?: string;
  batchSize: number;
  /**
   * Wall-clock budget, checked between batches, so a caller running under a
   * function timeout stops on its own and resumes from the returned cursor.
   * Runs to exhaustion when omitted.
   *
   * A budget rather than a batch count because the constraint being respected
   * is a duration. A batch count only stands in for one if you already know how
   * long a batch takes, which depends on document size, provider latency, and
   * how loaded the database is, and is therefore exactly the thing not worth
   * pinning to a constant.
   */
  timeBudgetMs?: number;
  /** Injectable clock, so the budget is testable without real time passing. */
  now?: () => number;
  onProgress?: (progress: PartnerSearchIndexProgress) => void;
}

/**
 * Pages enrollments by ID and writes them to the index.
 *
 * Keyset paging rather than offset, so per-batch cost stays flat however deep
 * the run gets. Shared by the backfill, which narrows to one program and runs
 * to exhaustion, and the reconciliation sweep, which runs unnarrowed in bounded
 * slices.
 *
 * Upserts only. A document whose enrollment was deleted is not removed here,
 * because an ID absent from a range scan is indistinguishable from one that was
 * never in range. Deletions are the call sites' responsibility.
 */
export async function indexPartnerSearchEnrollments({
  searchProvider,
  where,
  after,
  batchSize,
  timeBudgetMs,
  now = Date.now,
  onProgress,
}: IndexPartnerSearchEnrollmentsOptions) {
  const startedAt = now();
  let lastDocumentId = after;
  let processed = 0;
  let done = false;

  while (true) {
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        ...where,
        ...(lastDocumentId && {
          id: { gt: lastDocumentId },
        }),
      },
      select: partnerSearchDocumentSelect,
      orderBy: {
        id: "asc",
      },
      take: batchSize,
    });

    if (enrollments.length === 0) {
      done = true;
      break;
    }

    await searchProvider.upsert(
      enrollments.map(serializePartnerSearchDocument),
    );

    lastDocumentId = enrollments[enrollments.length - 1].id;
    processed += enrollments.length;

    onProgress?.({
      batchSize: enrollments.length,
      processed,
      lastDocumentId,
    });

    // A short page means the range is exhausted.
    if (enrollments.length < batchSize) {
      done = true;
      break;
    }

    // Checked after a batch rather than before, so a run always makes progress
    // however tight the budget is. One batch can therefore overrun it, which is
    // why callers leave headroom rather than budgeting to their whole limit.
    if (timeBudgetMs !== undefined && now() - startedAt >= timeBudgetMs) {
      break;
    }
  }

  return {
    processed,
    lastDocumentId: lastDocumentId ?? null,
    done,
  };
}

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
   * Wall-clock budget, checked between batches, so a caller under a function
   * timeout stops itself and resumes from the returned cursor. Runs to
   * exhaustion when omitted.
   */
  timeBudgetMs?: number;
  /** Injectable clock, so the budget is testable without real time passing. */
  now?: () => number;
  onProgress?: (progress: PartnerSearchIndexProgress) => void;
}

/**
 * Pages enrollments by ID and writes them to the index. Keyset paging, so
 * per-batch cost stays flat however deep the run gets.
 *
 * Upserts only. An ID absent from a range scan is indistinguishable from one
 * that was never in range, so deletions are the call sites' responsibility.
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

    // Checked after a batch, so a run always makes progress however tight the
    // budget is. One batch can therefore overrun it, hence the caller headroom.
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

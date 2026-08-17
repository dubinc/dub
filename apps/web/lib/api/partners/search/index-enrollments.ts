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
   * Batches to run before returning, so a caller on a request timeout can stop
   * and resume from the returned cursor. Runs to exhaustion when omitted.
   */
  maxBatches?: number;
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
  maxBatches,
  onProgress,
}: IndexPartnerSearchEnrollmentsOptions) {
  let lastDocumentId = after;
  let processed = 0;
  let batches = 0;
  let done = false;

  while (maxBatches === undefined || batches < maxBatches) {
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
    batches++;

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
  }

  return {
    processed,
    lastDocumentId: lastDocumentId ?? null,
    done,
  };
}

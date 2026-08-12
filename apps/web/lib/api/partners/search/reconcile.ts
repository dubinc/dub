import { prisma } from "@/lib/prisma";
import { getPartnerSearchProvider } from "./provider";
import type { PartnerSearchProvider } from "./types";

const DEFAULT_PAGE_SIZE = 500;

export interface PartnerSearchReconcileProgress {
  scanned: number;
  deleted: number;
  cursor: string | null;
}

interface ReconcilePartnerSearchIndexOptions {
  pageSize?: number;
  searchProvider?: PartnerSearchProvider | null;
  onProgress?: (progress: PartnerSearchReconcileProgress) => void;
}

/**
 * Deletes indexed documents whose program enrollment no longer exists.
 *
 * `backfillPartnerSearch` only upserts, so it cannot remove a document for a
 * deleted enrollment — an index that has drifted stays drifted no matter how
 * often it is rebuilt. Orphans are not harmless: they still match queries and
 * still consume one of the PARTNER_SEARCH_CANDIDATE_LIMIT slots, and because
 * the database join then drops them, the user silently sees fewer results than
 * the limit with nothing reporting an error.
 *
 * This sweeps the whole index rather than one program, because neither provider
 * can enumerate documents by program: Redis keys are prefixed by index name
 * only, and Turbopuffer pages over document IDs. Scoping to a program would
 * mean reading every document's body just to discard most of them.
 */
export async function reconcilePartnerSearchIndex({
  pageSize = DEFAULT_PAGE_SIZE,
  searchProvider = getPartnerSearchProvider(),
  onProgress,
}: ReconcilePartnerSearchIndexOptions = {}) {
  if (!searchProvider) {
    throw new Error("Partner search provider is not configured.");
  }

  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new Error("Page size must be a positive integer.");
  }

  let cursor: string | undefined;
  let scanned = 0;
  let deleted = 0;

  do {
    const page = await searchProvider.listDocumentIds({
      cursor,
      limit: pageSize,
    });
    scanned += page.documentIds.length;

    if (page.documentIds.length > 0) {
      const enrollments = await prisma.programEnrollment.findMany({
        where: {
          id: { in: page.documentIds },
        },
        select: { id: true },
      });

      const liveIds = new Set(enrollments.map(({ id }) => id));
      const staleIds = page.documentIds.filter(
        (documentId) => !liveIds.has(documentId),
      );

      if (staleIds.length > 0) {
        await searchProvider.delete(staleIds);
        deleted += staleIds.length;
      }
    }

    cursor = page.cursor ?? undefined;
    onProgress?.({ scanned, deleted, cursor: page.cursor });
  } while (cursor);

  return { scanned, deleted };
}

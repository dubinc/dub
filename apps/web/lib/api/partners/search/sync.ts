import { prisma } from "@/lib/prisma";
import { getPartnerSearchProvider } from "./provider";
import {
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
} from "./serialize-document";
import type { PartnerSearchProvider } from "./types";

/**
 * How many enrollments one sync resolves at a time, matching the backfill's
 * batch size. The provider chunks its own writes below this, so the ceiling
 * here is about how much the database hydrates at once, not the write size.
 */
export const PARTNER_SEARCH_SYNC_BATCH_SIZE = 500;

export interface PartnerSearchSyncResult {
  upserted: number;
  deleted: number;
}

interface SyncPartnerSearchDocumentsOptions {
  enrollmentIds: string[];
  searchProvider?: PartnerSearchProvider | null;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/**
 * Brings the index in line with the database for the given enrollments.
 *
 * Current state is read here rather than passed in by the caller, so a delayed
 * or replayed sync converges on the truth instead of re-applying whatever was
 * true when it was queued. That is also what makes deletes fall out for free:
 * an ID the database no longer has is removed from the index rather than
 * treated as an error, so a caller reacting to a deletion queues the same job
 * as one reacting to an edit.
 *
 * No-ops when no provider is configured, matching the read path, which falls
 * back to the database search rather than failing.
 */
export async function syncPartnerSearchDocuments({
  enrollmentIds,
  searchProvider = getPartnerSearchProvider(),
}: SyncPartnerSearchDocumentsOptions): Promise<PartnerSearchSyncResult> {
  const ids = unique(enrollmentIds);

  if (!searchProvider || ids.length === 0) {
    return { upserted: 0, deleted: 0 };
  }

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: partnerSearchDocumentSelect,
  });

  const foundIds = new Set(enrollments.map(({ id }) => id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  if (enrollments.length > 0) {
    await searchProvider.upsert(enrollments.map(serializePartnerSearchDocument));
  }

  if (missingIds.length > 0) {
    await searchProvider.delete(missingIds);
  }

  return {
    upserted: enrollments.length,
    deleted: missingIds.length,
  };
}

interface FindPartnerSearchSyncEnrollmentIdsOptions {
  partnerIds: string[];
  programId?: string;
  after?: string;
  take?: number;
}

/**
 * One page of enrollment IDs belonging to the given partners, for the changes
 * that fan out beyond a single enrollment: a profile edit or a platform change
 * touches every program the partner is enrolled in.
 *
 * Paged by enrollment ID so the caller can resume, because the fan-out is
 * unbounded — a partner enrolled in hundreds of programs produces hundreds of
 * documents from one profile write.
 *
 * `programId` narrows to a single enrollment per partner, which is what the
 * enrollment-scoped callers (group moves, status changes, tags) pass.
 */
export async function findPartnerSearchSyncEnrollmentIds({
  partnerIds,
  programId,
  after,
  take = PARTNER_SEARCH_SYNC_BATCH_SIZE,
}: FindPartnerSearchSyncEnrollmentIdsOptions): Promise<string[]> {
  const ids = unique(partnerIds);

  if (ids.length === 0) {
    return [];
  }

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: ids,
      },
      ...(programId && { programId }),
      ...(after && { id: { gt: after } }),
    },
    select: {
      id: true,
    },
    orderBy: {
      id: "asc",
    },
    take,
  });

  return enrollments.map(({ id }) => id);
}

import { prisma } from "@/lib/prisma";
import { getPartnerSearchProvider } from "./provider";
import {
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
} from "./serialize-document";
import type { PartnerSearchProvider } from "./types";

/**
 * How many enrollments one sync hydrates at a time. The provider chunks its own
 * writes below this, so this bounds the database read, not the write.
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
 * State is read here rather than passed in, so a delayed or replayed sync
 * converges on current truth. That is also what makes deletes free: an ID the
 * database no longer has is removed rather than treated as an error, so callers
 * queue the same payload whether they edited or deleted.
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
    await searchProvider.upsert(
      enrollments.map(serializePartnerSearchDocument),
    );
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
 * One page of enrollment IDs for the given partners, for changes that fan out
 * beyond a single enrollment: a profile or platform edit touches every program
 * the partner is in.
 *
 * Paged because that fan-out is unbounded. `programId` narrows it to one
 * enrollment per partner.
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

import { prisma } from "@/lib/prisma";
import { unique } from "@dub/utils";
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
  const ids = unique(enrollmentIds.filter(Boolean));

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

interface SyncPartnersOptions {
  partnerIds: string[];
  programId?: string;
  after?: string;
  take?: number;
  searchProvider?: PartnerSearchProvider | null;
}

export interface SyncPartnersResult {
  upserted: number;
  lastEnrollmentId: string | null;
}

/**
 * One page of documents for the given partners, for changes that fan out
 * beyond a single enrollment: a profile or platform edit touches every program
 * the partner is in. Paged because that fan-out is unbounded. `programId`
 * narrows it to one enrollment per partner.
 *
 * Upserts only. The rows come from the database, so there is nothing to
 * delete.
 */
export async function syncPartnerSearchDocumentsForPartners({
  partnerIds,
  programId,
  after,
  take = PARTNER_SEARCH_SYNC_BATCH_SIZE,
  searchProvider = getPartnerSearchProvider(),
}: SyncPartnersOptions): Promise<SyncPartnersResult> {
  const ids = unique(partnerIds.filter(Boolean));

  if (!searchProvider || ids.length === 0) {
    return { upserted: 0, lastEnrollmentId: null };
  }

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: ids,
      },
      ...(programId && { programId }),
      ...(after && { id: { gt: after } }),
    },
    select: partnerSearchDocumentSelect,
    orderBy: {
      id: "asc",
    },
    take,
  });

  if (enrollments.length > 0) {
    await searchProvider.upsert(
      enrollments.map(serializePartnerSearchDocument),
    );
  }

  return {
    upserted: enrollments.length,
    lastEnrollmentId: enrollments.at(-1)?.id ?? null,
  };
}

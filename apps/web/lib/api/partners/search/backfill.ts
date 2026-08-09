import { prisma } from "@/lib/prisma";
import { getPartnerSearchProvider } from "./provider";
import {
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
} from "./serialize-document";
import type { PartnerSearchProvider } from "./types";

const DEFAULT_BATCH_SIZE = 500;

export interface PartnerSearchBackfillProgress {
  batchSize: number;
  processed: number;
  lastDocumentId: string;
}

interface BackfillPartnerSearchOptions {
  programId: string;
  batchSize?: number;
  after?: string;
  searchProvider?: PartnerSearchProvider | null;
  onProgress?: (progress: PartnerSearchBackfillProgress) => void;
}

export async function backfillPartnerSearch({
  programId,
  batchSize = DEFAULT_BATCH_SIZE,
  after,
  searchProvider = getPartnerSearchProvider(),
  onProgress,
}: BackfillPartnerSearchOptions) {
  if (!searchProvider) {
    throw new Error("Partner search provider is not configured.");
  }

  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive integer.");
  }

  let lastDocumentId = after;
  let processed = 0;

  while (true) {
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
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

    if (enrollments.length < batchSize) {
      break;
    }
  }

  await searchProvider.waitForIndexing();

  return {
    processed,
    lastDocumentId: lastDocumentId ?? null,
  };
}

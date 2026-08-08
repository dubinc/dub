import { prisma } from "@/lib/prisma";
import { getPartnerSearchProvider } from "./provider";
import {
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
} from "./serialize-document";
import { PartnerSearchProvider } from "./types";

interface PartnerSearchSyncOptions {
  searchProvider?: PartnerSearchProvider | null;
}

function uniqueDocumentIds(documentIds: string[]): string[] {
  return Array.from(new Set(documentIds));
}

export async function syncPartnerSearchDocuments(
  documentIds: string[],
  {
    searchProvider = getPartnerSearchProvider(),
  }: PartnerSearchSyncOptions = {},
) {
  if (!searchProvider || documentIds.length === 0) {
    return;
  }

  const uniqueIds = uniqueDocumentIds(documentIds);
  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      id: { in: uniqueIds },
    },
    select: partnerSearchDocumentSelect,
  });

  if (enrollments.length > 0) {
    await searchProvider.upsert(
      enrollments.map(serializePartnerSearchDocument),
    );
  }

  const foundIds = new Set(enrollments.map(({ id }) => id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    await searchProvider.delete(missingIds);
  }
}

export async function syncPartnerSearchDocumentsByPartnerIds(
  partnerIds: string[],
  {
    searchProvider = getPartnerSearchProvider(),
  }: PartnerSearchSyncOptions = {},
) {
  if (!searchProvider || partnerIds.length === 0) {
    return;
  }

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: { in: uniqueDocumentIds(partnerIds) },
    },
    select: partnerSearchDocumentSelect,
  });

  if (enrollments.length > 0) {
    await searchProvider.upsert(
      enrollments.map(serializePartnerSearchDocument),
    );
  }
}

export async function deletePartnerSearchDocuments(
  documentIds: string[],
  {
    searchProvider = getPartnerSearchProvider(),
  }: PartnerSearchSyncOptions = {},
) {
  if (!searchProvider || documentIds.length === 0) {
    return;
  }

  await searchProvider.delete(uniqueDocumentIds(documentIds));
}

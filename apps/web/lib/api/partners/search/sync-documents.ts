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

export interface PartnerSearchProgramPartner {
  programId: string;
  partnerId: string;
}

function uniqueDocumentIds(documentIds: string[]): string[] {
  return Array.from(new Set(documentIds));
}

function uniqueProgramPartners(
  programPartners: PartnerSearchProgramPartner[],
): PartnerSearchProgramPartner[] {
  return Array.from(
    new Map(
      programPartners.map((item) => [
        JSON.stringify([item.programId, item.partnerId]),
        item,
      ]),
    ).values(),
  );
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

export async function syncPartnerSearchDocumentsByProgramPartners(
  programPartners: PartnerSearchProgramPartner[],
  {
    searchProvider = getPartnerSearchProvider(),
  }: PartnerSearchSyncOptions = {},
) {
  if (!searchProvider || programPartners.length === 0) {
    return;
  }

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      OR: uniqueProgramPartners(programPartners),
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

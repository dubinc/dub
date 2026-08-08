import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import type { Prisma } from "@prisma/client";
import { getPartnerSearchProvider } from "./provider";
import {
  partnerSearchDocumentSelect,
  serializePartnerSearchDocument,
} from "./serialize-document";
import type { PartnerSearchProvider } from "./types";

const PARTNER_SEARCH_SYNC_BATCH_SIZE = 100;

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

async function upsertPartnerSearchDocuments(
  where: Prisma.ProgramEnrollmentWhereInput,
  searchProvider: PartnerSearchProvider,
) {
  let cursor: string | undefined;

  while (true) {
    const enrollments = await prisma.programEnrollment.findMany({
      where,
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
      take: PARTNER_SEARCH_SYNC_BATCH_SIZE,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    if (enrollments.length === 0) {
      return;
    }

    await searchProvider.upsert(
      enrollments.map(serializePartnerSearchDocument),
    );

    if (enrollments.length < PARTNER_SEARCH_SYNC_BATCH_SIZE) {
      return;
    }

    cursor = enrollments[enrollments.length - 1].id;
  }
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

  for (const documentIdBatch of chunk(
    uniqueDocumentIds(documentIds),
    PARTNER_SEARCH_SYNC_BATCH_SIZE,
  )) {
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        id: { in: documentIdBatch },
      },
      select: partnerSearchDocumentSelect,
    });

    if (enrollments.length > 0) {
      await searchProvider.upsert(
        enrollments.map(serializePartnerSearchDocument),
      );
    }

    const foundIds = new Set(enrollments.map(({ id }) => id));
    const missingIds = documentIdBatch.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      await searchProvider.delete(missingIds);
    }
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

  for (const partnerIdBatch of chunk(
    uniqueDocumentIds(partnerIds),
    PARTNER_SEARCH_SYNC_BATCH_SIZE,
  )) {
    await upsertPartnerSearchDocuments(
      { partnerId: { in: partnerIdBatch } },
      searchProvider,
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

  for (const programPartnerBatch of chunk(
    uniqueProgramPartners(programPartners),
    PARTNER_SEARCH_SYNC_BATCH_SIZE,
  )) {
    await upsertPartnerSearchDocuments(
      { OR: programPartnerBatch },
      searchProvider,
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

  for (const documentIdBatch of chunk(
    uniqueDocumentIds(documentIds),
    PARTNER_SEARCH_SYNC_BATCH_SIZE,
  )) {
    await searchProvider.delete(documentIdBatch);
  }
}

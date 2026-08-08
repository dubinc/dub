import {
  syncPartnerSearchDocuments,
  syncPartnerSearchDocumentsByPartnerIds,
  syncPartnerSearchDocumentsByProgramPartners,
} from "@/lib/api/partners/search";
import { getPartnerSearchProvider } from "@/lib/api/partners/search/provider";
import type { Link } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z
  .object({
    documentIds: z.array(z.string()).min(1).optional(),
    partnerIds: z.array(z.string()).min(1).optional(),
    programPartners: z
      .array(
        z.object({
          programId: z.string(),
          partnerId: z.string(),
        }),
      )
      .min(1)
      .optional(),
  })
  .refine(
    ({ documentIds, partnerIds, programPartners }) =>
      documentIds || partnerIds || programPartners,
    {
      message: "At least one search document target is required.",
    },
  );

export const partnerSearchSyncJob = defineJob({
  name: "partner-search-sync-job",
  schema: inputSchema,
  defaults: {
    queue: "partner-search-sync",
    retries: 3,
  },
  async handle({ documentIds, partnerIds, programPartners }) {
    await Promise.all([
      documentIds ? syncPartnerSearchDocuments(documentIds) : Promise.resolve(),
      partnerIds
        ? syncPartnerSearchDocumentsByPartnerIds(partnerIds)
        : Promise.resolve(),
      programPartners
        ? syncPartnerSearchDocumentsByProgramPartners(programPartners)
        : Promise.resolve(),
    ]);
  },
});

export async function enqueuePartnerSearchSyncJob(
  payload: z.infer<typeof inputSchema>,
) {
  if (!getPartnerSearchProvider()) {
    return;
  }

  return partnerSearchSyncJob.dispatch(payload);
}

export async function enqueuePartnerSearchSyncForLinks(
  links: Pick<Link, "programId" | "partnerId">[],
) {
  const programPartners = Array.from(
    new Map(
      links.flatMap(({ programId, partnerId }) => {
        if (!programId || !partnerId) {
          return [];
        }

        return [
          [JSON.stringify([programId, partnerId]), { programId, partnerId }],
        ];
      }),
    ).values(),
  );

  if (programPartners.length === 0) {
    return;
  }

  return enqueuePartnerSearchSyncJob({ programPartners });
}

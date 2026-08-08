import {
  syncPartnerSearchDocuments,
  syncPartnerSearchDocumentsByPartnerIds,
} from "@/lib/api/partners/search";
import { getPartnerSearchProvider } from "@/lib/api/partners/search/provider";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z
  .object({
    documentIds: z.array(z.string()).min(1).optional(),
    partnerIds: z.array(z.string()).min(1).optional(),
  })
  .refine(({ documentIds, partnerIds }) => documentIds || partnerIds, {
    message: "At least one document or partner ID is required.",
  });

export const partnerSearchSyncJob = defineJob({
  name: "partner-search-sync-job",
  schema: inputSchema,
  defaults: {
    queue: "partner-search-sync",
    retries: 3,
  },
  async handle({ documentIds, partnerIds }) {
    await Promise.all([
      documentIds ? syncPartnerSearchDocuments(documentIds) : Promise.resolve(),
      partnerIds
        ? syncPartnerSearchDocumentsByPartnerIds(partnerIds)
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

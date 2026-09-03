import {
  findPartnerSearchSyncEnrollmentIds,
  getPartnerSearchProvider,
  PARTNER_SEARCH_SYNC_BATCH_SIZE,
  syncPartnerSearchDocuments,
} from "@/lib/api/partners/search";
import * as z from "zod/v4";
import { defineJob } from "../index";

/**
 * How many syncs may write to the provider at once. A bulk group move fans out
 * to dozens of jobs that would otherwise all write at the same moment.
 * Interactive edits queue behind that, which is the trade. Tune against the
 * provider's write limits.
 */
const SYNC_PARALLELISM = 20;

/**
 * Two shapes, because the two kinds of change have different blast radii.
 *
 * `enrollments` carries IDs the caller already has, and is the only shape that
 * can express a deletion, since the handler finds out by failing to read one
 * back. `partners` is for changes that fan out past one enrollment, where the
 * caller knows the partner but not how many programs it reaches.
 */
const inputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("enrollments"),
    enrollmentIds: z
      .array(z.string())
      .min(1)
      .max(PARTNER_SEARCH_SYNC_BATCH_SIZE),
  }),
  z.object({
    type: z.literal("partners"),
    partnerIds: z.array(z.string()).min(1).max(PARTNER_SEARCH_SYNC_BATCH_SIZE),
    programId: z.string().optional(),
    after: z.string().optional(),
  }),
]);

export const partnerSearchSyncJob = defineJob({
  name: "partner-search-sync-job",
  schema: inputSchema,
  defaults: {
    retries: 3,
    flowControl: {
      key: "partner-search-sync",
      parallelism: SYNC_PARALLELISM,
    },
  },
  async handle(input) {
    const searchProvider = getPartnerSearchProvider();

    // An environment without the key should not accumulate a backlog of jobs
    // that can never succeed.
    if (!searchProvider) {
      console.log(
        "[partnerSearchSyncJob] No search provider configured. Skipping...",
      );
      return;
    }

    if (input.type === "enrollments") {
      const { upserted, deleted } = await syncPartnerSearchDocuments({
        enrollmentIds: input.enrollmentIds,
        searchProvider,
      });

      console.log(
        `[partnerSearchSyncJob] Synced ${upserted} and removed ${deleted} enrollment documents.`,
      );

      return;
    }

    const enrollmentIds = await findPartnerSearchSyncEnrollmentIds({
      partnerIds: input.partnerIds,
      programId: input.programId,
      after: input.after,
      take: PARTNER_SEARCH_SYNC_BATCH_SIZE,
    });

    if (enrollmentIds.length === 0) {
      return;
    }

    const { upserted, deleted } = await syncPartnerSearchDocuments({
      enrollmentIds,
      searchProvider,
    });

    console.log(
      `[partnerSearchSyncJob] Synced ${upserted} and removed ${deleted} enrollment documents for ${input.partnerIds.length} partner(s).`,
    );

    if (enrollmentIds.length === PARTNER_SEARCH_SYNC_BATCH_SIZE) {
      await partnerSearchSyncJob.dispatch(
        {
          ...input,
          after: enrollmentIds[enrollmentIds.length - 1],
        },
        {
          delay: 1,
        },
      );
    }
  },
});

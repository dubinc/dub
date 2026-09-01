import {
  getPartnerSearchProvider,
  sweepPartnerSearch,
} from "@/lib/api/partners/search";
import * as z from "zod/v4";
import { defineJob } from "../index";

/**
 * One hop per cursor. QStash can deliver a hop twice, and each copy would
 * re-index the rest of the pass and dispatch its own continuation.
 */
export function partnerSearchSweepDeduplicationId(after?: string | null) {
  return `partner-search-sweep-${after ?? "start"}`;
}

const inputSchema = z.object({
  /** Keyset cursor, carried across hops. Absent starts a fresh pass. */
  after: z.string().optional(),
  /**
   * Documents indexed so far in this pass, for logging. Defaulted in the
   * handler. A zod default would make it required in the dispatch payload type.
   */
  processed: z.number().int().nonnegative().optional(),
});

export const partnerSearchSweepJob = defineJob({
  name: "partner-search-sweep-job",
  schema: inputSchema,
  defaults: {
    retries: 3,
    flowControl: {
      // Hops are sequential. One in flight bounds the sweep's write load.
      key: "partner-search-sweep",
      parallelism: 1,
    },
  },
  async handle({ after, processed: alreadyProcessed = 0 }) {
    if (!getPartnerSearchProvider()) {
      console.log(
        "[partnerSearchSweepJob] No search provider configured. Skipping...",
      );
      return;
    }

    const { processed, lastDocumentId, done } = await sweepPartnerSearch({
      after,
    });

    const totalProcessed = alreadyProcessed + processed;

    if (done) {
      console.log(
        `[partnerSearchSweepJob] Pass complete. Re-indexed ${totalProcessed} documents.`,
        { totalProcessed },
      );
      return;
    }

    console.log(
      `[partnerSearchSweepJob] Re-indexed ${totalProcessed} documents so far, continuing after ${lastDocumentId}.`,
      { after: lastDocumentId, processedInHop: processed, totalProcessed },
    );

    await partnerSearchSweepJob.dispatch(
      {
        ...(lastDocumentId && { after: lastDocumentId }),
        processed: totalProcessed,
      },
      {
        delay: 1,
        deduplicationId: partnerSearchSweepDeduplicationId(lastDocumentId),
      },
    );
  },
});

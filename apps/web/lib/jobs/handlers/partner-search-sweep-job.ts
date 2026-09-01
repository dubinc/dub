import {
  getPartnerSearchProvider,
  sweepPartnerSearch,
} from "@/lib/api/partners/search";
import * as z from "zod/v4";
import { defineJob } from "../index";

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
      );
      return;
    }

    console.log(
      `[partnerSearchSweepJob] Re-indexed ${totalProcessed} documents so far, continuing after ${lastDocumentId}.`,
    );

    await partnerSearchSweepJob.dispatch(
      {
        ...(lastDocumentId && { after: lastDocumentId }),
        processed: totalProcessed,
      },
      {
        delay: 1,
      },
    );
  },
});

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
   * Documents indexed so far in this pass, for logging continuity. Defaulted in
   * the handler rather than by the schema, because defineJob types the dispatch
   * payload from the schema's output and a zod default would make this required
   * at every call site.
   */
  processed: z.number().int().nonnegative().optional(),
  /** One-shot watermark mode. See sweepPartnerSearch. */
  since: z.iso.datetime().optional(),
});

export const partnerSearchSweepJob = defineJob({
  name: "partner-search-sweep-job",
  schema: inputSchema,
  defaults: {
    retries: 3,
    flowControl: {
      // A pass is inherently sequential, and holding it to one in flight keeps
      // a long sweep from competing with interactive syncs for write capacity.
      key: "partner-search-sweep",
      parallelism: 1,
    },
  },
  async handle({ after, processed: alreadyProcessed = 0, since }) {
    if (!getPartnerSearchProvider()) {
      console.log(
        "[partnerSearchSweepJob] No search provider configured. Skipping...",
      );
      return;
    }

    const { processed, lastDocumentId, done } = await sweepPartnerSearch({
      after,
      ...(since && { since: new Date(since) }),
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

    // Cursor lives in the payload rather than in storage, so a pass needs no
    // state of its own and an interrupted one simply restarts on the next cron.
    await partnerSearchSweepJob.dispatch(
      {
        ...(lastDocumentId && { after: lastDocumentId }),
        processed: totalProcessed,
        ...(since && { since }),
      },
      {
        delay: 1,
      },
    );
  },
});

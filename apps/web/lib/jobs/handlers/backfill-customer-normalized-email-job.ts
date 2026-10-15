import { backfillCustomerNormalizedEmailBatch } from "@/lib/api/customers/backfill-customer-normalized-email";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  startingAfter: z.string().optional(),
});

// TODO: Remove this job (and its entry in jobLoaders, the helper in
// lib/api/customers/backfill-customer-normalized-email.ts, and the
// scripts/migrations/backfill-customer-normalized-email.ts script)
// once the normalizedEmail backfill has finished running in production.
export const backfillCustomerNormalizedEmailJob = defineJob({
  name: "backfill-customer-normalized-email-job",
  schema: inputSchema,
  defaults: {
    retries: 3,
    flowControl: {
      key: "backfill-customer-normalized-email",
      parallelism: 10,
    },
  },
  async handle(input) {
    const { startingAfter } = input;

    const { customers, updates, updatedCount, lastId, hasMore } =
      await backfillCustomerNormalizedEmailBatch({ startingAfter });

    if (customers.length === 0) {
      console.log(
        `No more customers to backfill after ${startingAfter ?? "start"}.`,
      );
      return;
    }

    if (updates.length === 0) {
      console.log(`No customers to update in this batch. Cursor: ${lastId}`);
    } else {
      console.log(
        `Updated ${updatedCount} of ${customers.length} customers. Cursor: ${lastId}`,
      );
    }

    if (hasMore && lastId) {
      await backfillCustomerNormalizedEmailJob.dispatch({
        startingAfter: lastId,
      });
    }
  },
});

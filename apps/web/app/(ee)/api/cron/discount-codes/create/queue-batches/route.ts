import { withCron } from "@/lib/cron/with-cron";
import { publishDiscountCodesCreationJob } from "@/lib/jobs/handlers/publish-discount-codes-creation-job";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  discountId: z.string(),
  startingAfter: z.string().optional(),
});

// POST /api/cron/discount-codes/create/queue-batches
// Drain shim for in-flight QStash messages; new work uses publish-discount-codes-creation-job.
// TODO: Remove this route after in-flight QStash messages to this URL have drained.
export const POST = withCron(async ({ rawBody }) => {
  const payload = inputSchema.parse(JSON.parse(rawBody));
  await publishDiscountCodesCreationJob.execute(payload);
  return logAndRespond(
    `Executed publish-discount-codes-creation-job for ${payload.discountId}.`,
  );
});

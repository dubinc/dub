import { withCron } from "@/lib/cron/with-cron";
import { createDiscountCodeForLinkJob } from "@/lib/jobs/handlers/create-discount-code-for-link-job";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/discount-codes/create
// Drain shim for in-flight QStash messages; new work uses create-discount-code-for-link-job.
// TODO: Remove this route after in-flight QStash messages to this URL have drained.
export const POST = withCron(async ({ rawBody }) => {
  await createDiscountCodeForLinkJob.execute(JSON.parse(rawBody));
  return logAndRespond("Successfully processed discount code creation.");
});

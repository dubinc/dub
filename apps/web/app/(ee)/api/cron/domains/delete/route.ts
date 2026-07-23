import { withCron } from "@/lib/cron/with-cron";
import { domainDeletedJob } from "@/lib/jobs/handlers/domain-deleted-job";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  domain: z.string(),
});

// Legacy QStash endpoint kept for in-flight messages published before the
// jobs migration

// TODO: Remove this route after old QStash traffic has drained.

// POST /api/cron/domains/delete
export const POST = withCron(async ({ rawBody }) => {
  const { domain } = schema.parse(JSON.parse(rawBody));

  await domainDeletedJob.execute({ domain });

  return logAndRespond(
    `Forwarded domain ${domain} deletion to domainDeletedJob.`,
  );
});

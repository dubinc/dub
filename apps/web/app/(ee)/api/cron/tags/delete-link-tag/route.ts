import { withCron } from "@/lib/cron/with-cron";
import { linkTagDeletedJob } from "@/lib/jobs/handlers/link-tag-deleted-job";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string(),
});

// Legacy QStash endpoint kept for in-flight messages published before the
// jobs migration. Forwards to linkTagDeletedJob;

// TODO: Remove this route after old QStash traffic has drained.

// POST /api/cron/tags/delete-link-tag
export const POST = withCron(async ({ rawBody }) => {
  const { id: tagId } = schema.parse(JSON.parse(rawBody));

  await linkTagDeletedJob.execute({
    tagId,
  });

  return logAndRespond(
    `Forwarded link tag ${tagId} deletion to linkTagDeletedJob.`,
  );
});

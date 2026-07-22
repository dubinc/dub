import { withCron } from "@/lib/cron/with-cron";
import { defaultLinkDeletedJob } from "@/lib/jobs/handlers/default-link-deleted-job";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  partnerGroupDefaultLinkId: z.string(),
});

// Legacy QStash endpoint kept for in-flight messages published before the
// jobs migration.

// TODO: Remove this route after old QStash traffic has drained.

// POST /api/cron/groups/delete-default-links
export const POST = withCron(async ({ rawBody }) => {
  const { partnerGroupDefaultLinkId: defaultLinkId } = schema.parse(
    JSON.parse(rawBody),
  );

  await defaultLinkDeletedJob.dispatch(
    {
      defaultLinkId,
    },
    {
      delay: 1,
      label: defaultLinkId,
    },
  );

  return logAndRespond(
    `Forwarded default link deletion to defaultLinkDeletedJob.`,
  );
});

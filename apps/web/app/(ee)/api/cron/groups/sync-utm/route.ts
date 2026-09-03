import { withCron } from "@/lib/cron/with-cron";
import { syncGroupUtmJob } from "@/lib/jobs/handlers/sync-group-utm-job";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const schema = z.object({
  groupId: z.string(),
  partnerIds: z.array(z.string()).optional(),
  startAfterProgramEnrollmentId: z.string().optional(),
});

// TODO:
// Remove this route after few hours of deployment

// POST /api/cron/groups/sync-utm
export const POST = withCron(async ({ rawBody }) => {
  const { groupId, partnerIds, startAfterProgramEnrollmentId } = schema.parse(
    JSON.parse(rawBody),
  );

  await syncGroupUtmJob.dispatch({
    groupId,
    partnerIds,
    startAfterProgramEnrollmentId,
  });

  return logAndRespond("OK");
});

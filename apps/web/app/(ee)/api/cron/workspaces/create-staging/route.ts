import { withCron } from "@/lib/cron/with-cron";
import { createStagingProgram } from "@/lib/sandbox/create-staging-program";
import { createStagingWorkspace } from "@/lib/sandbox/create-staging-workspace";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  workspaceId: z.string(),
});

// POST /api/cron/workspaces/create-staging
export const POST = withCron(async ({ rawBody }) => {
  const { workspaceId } = inputSchema.parse(JSON.parse(rawBody));

  await createStagingWorkspace(workspaceId);
  await createStagingProgram(workspaceId);

  return logAndRespond("OK");
});

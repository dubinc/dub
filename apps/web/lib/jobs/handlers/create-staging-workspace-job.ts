import { createStagingProgram } from "@/lib/sandbox/create-staging-program";
import { createStagingWorkspace } from "@/lib/sandbox/create-staging-workspace";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  workspaceId: z.string(),
});

export const createStagingWorkspaceJob = defineJob({
  name: "create-staging-workspace-job",
  schema: inputSchema,
  async handle({ workspaceId }) {
    await createStagingWorkspace(workspaceId);
    await createStagingProgram(workspaceId);
  },
});

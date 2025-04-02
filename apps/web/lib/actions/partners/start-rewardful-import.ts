"use server";

import { rewardfulImporter } from "@/lib/rewardful/importer";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  campaignId: z.string().describe("Rewardful campaign ID to import."),
});

export const startRewardfulImportAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { campaignId, programId } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!program.domain) {
      throw new Error("Program domain is not set.");
    }

    if (!program.url) {
      throw new Error("Program URL is not set.");
    }

    const credentials = await rewardfulImporter.getCredentials(workspace.id);

    await rewardfulImporter.setCredentials(workspace.id, {
      ...credentials,
      campaignId,
    });

    await rewardfulImporter.queue({
      programId,
      action: "import-campaign",
    });
  });

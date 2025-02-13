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

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const credentials = await rewardfulImporter.getCredentials(programId);

    await rewardfulImporter.setCredentials(programId, {
      ...credentials,
      campaignId,
    });

    await rewardfulImporter.queue({
      programId,
      action: "import-campaign",
    });
  });

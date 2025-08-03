"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { nanoid } from "@dub/utils";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  campaignId: z.string().describe("Rewardful campaign ID to import."),
});

export const startRewardfulImportAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { campaignId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

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

    await rewardfulImporter.queue({
      importId: nanoid(),
      userId: user.id,
      programId,
      campaignId,
      action: "import-campaign",
    });
  });

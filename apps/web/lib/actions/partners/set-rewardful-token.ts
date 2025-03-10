"use server";

import { RewardfulApi } from "@/lib/rewardful/api";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  token: z.string(),
});

export const setRewardfulTokenAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { token } = parsedInput;

    if (!workspace.partnersEnabled) {
      throw new Error("You are not allowed to perform this action.");
    }

    const rewardfulApi = new RewardfulApi({ token });

    try {
      await rewardfulApi.listCampaigns();
    } catch (error) {
      console.error(error);
      throw new Error("Invalid Rewardful token");
    }

    await rewardfulImporter.setCredentials(workspace.id, {
      userId: user.id,
      token,
      campaignId: "", // We'll set in the second step after choosing the campaign
    });

    return {
      maskedToken: token.slice(0, 3) + "*".repeat(token.length - 3),
    };
  });

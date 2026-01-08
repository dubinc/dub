"use server";

import { RewardfulApi } from "@/lib/rewardful/api";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  token: z.string(),
});

export const setRewardfulTokenAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { token } = parsedInput;

    const rewardfulApi = new RewardfulApi({ token });

    try {
      await rewardfulApi.listCampaigns();
    } catch (error) {
      console.error(error);
      throw new Error("Invalid Rewardful token");
    }

    await rewardfulImporter.setCredentials(workspace.id, {
      token,
    });

    return {
      maskedToken: token.slice(0, 3) + "*".repeat(token.length - 3),
    };
  });

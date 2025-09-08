"use server";

import { FirstPromoterApi } from "@/lib/firstpromoter/api";
import { firstPromoterImporter } from "@/lib/firstpromoter/importer";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  apiKey: z.string().trim().min(1),
  accountId: z.string().trim().min(1),
});

export const setFirstPromoterTokenAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { apiKey, accountId } = parsedInput;

    const firstPromoterApi = new FirstPromoterApi({ apiKey, accountId });

    try {
      await firstPromoterApi.listCampaigns();
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Invalid FirstPromoter credentials.",
      );
    }

    await firstPromoterImporter.setCredentials(workspace.id, {
      apiKey,
      accountId,
    });

    return {
      maskedApiKey:
        apiKey.slice(0, 3) + "*".repeat(Math.max(0, apiKey.length - 3)),
    };
  });

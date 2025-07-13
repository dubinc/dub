"use server";

import { PartnerStackApi } from "@/lib/partnerstack/api";
import { partnerstackImporter } from "@/lib/partnerstack/importer";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  partnerstackProgramId: z.string().describe("PartnerStack program ID to import."),
  token: z.string(),
});

export const setPartnerStackTokenAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { token, partnerstackProgramId } = parsedInput;

    if (!workspace.partnersEnabled) {
      throw new Error("You are not allowed to perform this action.");
    }

    const partnerstackApi = new PartnerStackApi({ token });

    try {
      // Test the API connection by attempting to fetch program info
      // Note: PartnerStack doesn't return detailed program info, so we'll just validate the token
      await partnerstackApi.testConnection();
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Invalid PartnerStack token or program ID.",
      );
    }

    await partnerstackImporter.setCredentials(workspace.id, {
      userId: user.id,
      token,
      partnerstackProgramId,
    });

    return {
      success: true,
    };
  }); 
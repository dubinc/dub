"use server";

import { TapfiliateApi } from "@/lib/tapfiliate/api";
import { tapfiliateImporter } from "@/lib/tapfiliate/importer";
import { TapfiliateProgram } from "@/lib/tapfiliate/types";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  apiKey: z.string().trim().min(1),
});

export const setTapfiliateTokenAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { apiKey } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const tapfiliateApi = new TapfiliateApi({
      apiKey,
    });

    // Validate the API key by listing the account's programs
    let programs: TapfiliateProgram[];

    try {
      programs = await tapfiliateApi.listPrograms();
    } catch (error) {
      console.error(error);
      throw new Error("Invalid Tapfiliate API key.");
    }

    if (programs.length === 0) {
      throw new Error("No programs found in your Tapfiliate account.");
    }

    await tapfiliateImporter.setCredentials(workspace.id, {
      apiKey,
    });

    return {
      programs,
    };
  });

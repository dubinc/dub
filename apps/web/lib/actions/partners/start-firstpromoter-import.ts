"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { FirstPromoterApi } from "@/lib/firstpromoter/api";
import { firstPromoterImporter } from "@/lib/firstpromoter/importer";
import { firstPromoterCredentialsSchema } from "@/lib/firstpromoter/schemas";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";

const schema = firstPromoterCredentialsSchema.extend({
  workspaceId: z.string(),
});

export const startFirstPromoterImportAction = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { apiKey, accountId } = parsedInput;

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

    const firstPromoterApi = new FirstPromoterApi({ apiKey, accountId });

    try {
      await firstPromoterApi.testConnection();
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

    await firstPromoterImporter.queue({
      importId: createId({ prefix: "import_" }),
      action: "import-campaigns",
      userId: user.id,
      programId,
    });
  });

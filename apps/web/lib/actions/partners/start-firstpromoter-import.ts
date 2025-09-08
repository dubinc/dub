"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { firstPromoterImporter } from "@/lib/firstpromoter/importer";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  campaignId: z.string().trim().min(1),
});

export const startFirstPromoterImportAction = authActionClient
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

    await firstPromoterImporter.queue({
      importId: createId({ prefix: "import_" }),
      action: "import-partners",
      userId: user.id,
      programId,
      campaignId,
    });
  });

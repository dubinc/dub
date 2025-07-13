"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { partnerstackImporter } from "@/lib/partnerstack/importer";
import { authActionClient } from "../safe-action";
import { z } from "zod";

const schema = z.object({
  workspaceId: z.string(),
});

export const startPartnerStackImportAction = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

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

    const credentials = await partnerstackImporter.getCredentials(workspace.id);

    if (!credentials) {
      throw new Error(
        "PartnerStack credentials not found. Please restart the import process.",
      );
    }

    await partnerstackImporter.queue({
      action: "import-affiliates",
      programId,
    });
  }); 
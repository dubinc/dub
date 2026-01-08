"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { toltImporter } from "@/lib/tolt/importer";
import * as z from "zod/v4";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  toltProgramId: z.string().trim().min(1),
});

export const startToltImportAction = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { toltProgramId } = parsedInput;

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

    const credentials = await toltImporter.getCredentials(workspace.id);

    if (!credentials) {
      throw new Error(
        "Tolt credentials not found. Please restart the import process.",
      );
    }

    await toltImporter.queue({
      importId: createId({ prefix: "import_" }),
      userId: user.id,
      programId: program.id,
      toltProgramId,
      action: "import-partners",
    });
  });

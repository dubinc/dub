"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { TapfiliateApi } from "@/lib/tapfiliate/api";
import { tapfiliateImporter } from "@/lib/tapfiliate/importer";
import * as z from "zod/v4";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  tapfiliateProgramId: z.string().trim().min(1),
});

export const startTapfiliateImportAction = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { tapfiliateProgramId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

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

    const credentials = await tapfiliateImporter.getCredentials(workspace.id);

    const tapfiliateApi = new TapfiliateApi({
      apiKey: credentials.apiKey,
    });

    try {
      await tapfiliateApi.getProgram({
        programId: tapfiliateProgramId,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Invalid Tapfiliate program ID.");
    }

    await tapfiliateImporter.queue({
      importId: createId({ prefix: "import_" }),
      userId: user.id,
      programId: program.id,
      tapfiliateProgramId,
      action: "import-groups",
    });
  });

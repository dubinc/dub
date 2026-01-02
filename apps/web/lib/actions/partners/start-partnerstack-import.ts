"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { PartnerStackApi } from "@/lib/partnerstack/api";
import { partnerStackImporter } from "@/lib/partnerstack/importer";
import { partnerStackCredentialsSchema } from "@/lib/partnerstack/schemas";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";

const schema = partnerStackCredentialsSchema.extend({
  workspaceId: z.string(),
});

export const startPartnerStackImportAction = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { publicKey, secretKey } = parsedInput;

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

    const partnerStackApi = new PartnerStackApi({
      publicKey,
      secretKey,
    });

    await partnerStackApi.testConnection();

    await partnerStackImporter.setCredentials(workspace.id, {
      publicKey,
      secretKey,
    });

    await partnerStackImporter.queue({
      importId: createId({ prefix: "import_" }),
      programId,
      userId: user.id,
      action: "import-groups",
    });
  });

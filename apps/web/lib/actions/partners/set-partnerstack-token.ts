"use server";

import { PartnerStackApi } from "@/lib/partnerstack/api";
import { partnerStackImporter } from "@/lib/partnerstack/importer";
import { partnerStackCredentialsSchema } from "@/lib/partnerstack/schemas";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = partnerStackCredentialsSchema.extend({
  workspaceId: z.string(),
});

export const setPartnerStackTokenAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { publicKey, secretKey } = parsedInput;

    if (!workspace.partnersEnabled) {
      throw new Error("You are not allowed to perform this action.");
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
  });

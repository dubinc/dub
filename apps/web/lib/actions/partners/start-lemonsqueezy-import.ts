"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { LemonSqueezyApi } from "@/lib/lemonsqueezy/api";
import { lemonSqueezyImporter } from "@/lib/lemonsqueezy/importer";
import * as z from "zod/v4";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  storeId: z.string().trim().min(1),
});

export const startLemonSqueezyImportAction = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { storeId } = parsedInput;

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

    const credentials = await lemonSqueezyImporter.getCredentials(workspace.id);

    const lemonSqueezyApi = new LemonSqueezyApi({
      apiKey: credentials.apiKey,
    });

    const stores = await lemonSqueezyApi.listStores();

    if (!stores.some((store) => store.id === storeId)) {
      throw new Error("Invalid Lemon Squeezy store ID.");
    }

    await lemonSqueezyImporter.queue({
      importId: createId({ prefix: "import_" }),
      userId: user.id,
      programId: program.id,
      storeId,
      action: "import-partners",
    });
  });

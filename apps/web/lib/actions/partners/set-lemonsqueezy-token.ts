"use server";

import { LemonSqueezyApi } from "@/lib/lemonsqueezy/api";
import { lemonSqueezyImporter } from "@/lib/lemonsqueezy/importer";
import { LemonSqueezyStore } from "@/lib/lemonsqueezy/types";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  apiKey: z.string().trim().min(1),
});

export const setLemonSqueezyTokenAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { apiKey } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const lemonSqueezyApi = new LemonSqueezyApi({
      apiKey,
    });

    let stores: LemonSqueezyStore[];

    try {
      stores = await lemonSqueezyApi.listStores();
    } catch (error) {
      console.error(error);
      throw new Error("Invalid Lemon Squeezy API key.");
    }

    if (stores.length === 0) {
      throw new Error("No stores found in your Lemon Squeezy account.");
    }

    await lemonSqueezyImporter.setCredentials(workspace.id, {
      apiKey,
    });

    return {
      stores,
    };
  });

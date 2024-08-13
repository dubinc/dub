"use server";

import { getFeatureFlags } from "../edge-config";
import { getStripeInstallationUrl } from "../integrations/stripe";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  integrationSlug: z.string(),
});

// Get the installation URL for an integration
export const getIntegrationInstallUrl = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { integrationSlug } = parsedInput;

    let url: string | null = null;

    // TODO:
    // Move the installation URL logic to the respective integration specific file
    if (integrationSlug === "stripe") {
      const flags = await getFeatureFlags({ workspaceId: workspace.id });

      if (!flags.conversions) {
        throw new Error("Conversions feature is not enabled.");
      }

      url = await getStripeInstallationUrl(workspace.id);
    } else {
      throw new Error("Invalid integration slug");
    }

    return { url };
  });

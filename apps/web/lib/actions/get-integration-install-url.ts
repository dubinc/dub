"use server";

import { getSlackInstallationUrl } from "../integrations/slack/install";
import { getStripeInstallationUrl } from "../integrations/stripe/install";
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

    if (integrationSlug === "stripe") {
      if (!workspace.conversionEnabled) {
        throw new Error("Conversions feature is not enabled.");
      }
      url = await getStripeInstallationUrl(workspace.id);
    } else if (integrationSlug === "slack") {
      url = await getSlackInstallationUrl(workspace.id);
    } else {
      throw new Error("Invalid integration slug");
    }

    return { url };
  });

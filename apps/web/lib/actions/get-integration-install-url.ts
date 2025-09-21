"use server";

import { getHubSpotInstallationUrl } from "../integrations/hubspot/install";
import { getSlackInstallationUrl } from "../integrations/slack/install";
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

    if (integrationSlug === "slack") {
      url = await getSlackInstallationUrl(workspace.id);
    } else if (integrationSlug === "hubspot") {
      url = await getHubSpotInstallationUrl(workspace.id);
    } else {
      throw new Error("Invalid integration slug");
    }

    return { url };
  });

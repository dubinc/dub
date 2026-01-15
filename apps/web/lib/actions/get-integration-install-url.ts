"use server";

import * as z from "zod/v4";
import { hubSpotOAuthProvider } from "../integrations/hubspot/oauth";
import { slackOAuthProvider } from "../integrations/slack/oauth";
import { authActionClient } from "./safe-action";
import { throwIfNoPermission } from "./throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  integrationSlug: z.string(),
});

// Get the installation URL for an integration
export const getIntegrationInstallUrl = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { integrationSlug } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    let url: string | null = null;

    if (integrationSlug === "slack") {
      url = await slackOAuthProvider.generateAuthUrl(workspace.id);
    } else if (integrationSlug === "hubspot") {
      url = await hubSpotOAuthProvider.generateAuthUrl(workspace.id);
    } else {
      throw new Error("Invalid integration slug");
    }

    return { url };
  });

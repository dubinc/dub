"use server";

import {
  HUBSPOT_INTEGRATION_ID,
  INTERCOM_INTEGRATION_ID,
  SLACK_INTEGRATION_ID,
} from "@dub/utils";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils/src";
import * as z from "zod/v4";
import { googleAdsOAuthProvider } from "../integrations/google-ads/oauth";
import { hubSpotOAuthProvider } from "../integrations/hubspot/oauth";
import { intercomOAuthProvider } from "../integrations/intercom/oauth";
import { slackOAuthProvider } from "../integrations/slack/oauth";
import { prisma } from "../prisma";
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
      requiredPermissions: ["integrations.write"],
    });

    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        slug: integrationSlug,
      },
      select: {
        id: true,
      },
    });

    let url: string | null = null;

    if (integration.id === SLACK_INTEGRATION_ID) {
      url = await slackOAuthProvider.generateAuthUrl(workspace.id);
    } else if (integration.id === HUBSPOT_INTEGRATION_ID) {
      url = await hubSpotOAuthProvider.generateAuthUrl(workspace.id);
    } else if (integration.id === INTERCOM_INTEGRATION_ID) {
      url = await intercomOAuthProvider.generateAuthUrl(workspace.id);
    } else if (integration.id === GOOGLE_ADS_INTEGRATION_ID) {
      url = await googleAdsOAuthProvider.generateAuthUrl(workspace.id);
    } else {
      throw new Error("Invalid integration.");
    }

    return {
      url,
    };
  });

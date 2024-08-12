"use server";

import { nanoid } from "@dub/utils";
import { getFeatureFlags } from "../edge-config";
import { redis } from "../upstash";
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
      url = await stripeInstallationUrl(workspace.id);
    } else if (integrationSlug === "slack") {
      url = await slackInstallationUrl(workspace.id);
    } else {
      throw new Error("Invalid integration slug");
    }

    return { url };
  });

// Stripe installation URL
const stripeInstallationUrl = async (workspaceId: string) => {
  const flags = await getFeatureFlags({ workspaceId });

  if (!flags.conversions) {
    throw new Error("Conversions feature is not enabled.");
  }

  const state = nanoid(16);
  await redis.set(`stripe:install:state:${state}`, workspaceId, {
    ex: 30 * 60,
  });

  const url = new URL(`${process.env.STRIPE_APP_INSTALL_URL}`);
  url.searchParams.set("state", state);
  url.searchParams.set(
    "redirect_uri",
    `${process.env.APP_DOMAIN_WITH_NGROK}/api/stripe/connect/callback`,
  );

  return url.toString();
};

// Slack installation URL
const slackInstallationUrl = async (workspaceId: string) => {
  const state = nanoid(16);
  await redis.set(`slack:install:state:${state}`, workspaceId, {
    ex: 30 * 60,
  });

  const url = new URL(`${process.env.SLACK_APP_INSTALL_URL}`);
  url.searchParams.set("state", state);
  url.searchParams.set(
    "redirect_uri",
    `${process.env.APP_DOMAIN_WITH_NGROK}/api/slack/callback`,
  );

  return url.toString();
};

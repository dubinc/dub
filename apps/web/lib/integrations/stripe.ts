import { nanoid } from "nanoid";
import { redis } from "../upstash";

export const getStripeInstallationUrl = async (workspaceId: string) => {
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

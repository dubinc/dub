import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { get } from "@vercel/edge-config";
import { nanoid } from "nanoid";
import { redis } from "../../upstash";
import z from "../../zod";

const envSchema = z.object({
  STRIPE_APP_INSTALL_URL: z.string(),
});

export const getStripeInstallationUrl = async (workspaceId: string) => {
  const state = nanoid(16);
  await redis.set(`stripe:install:state:${state}`, workspaceId, {
    ex: 30 * 60,
  });

  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new Error(
      "Stripe App environment variables are not configured properly.",
    );
  }

  // const { STRIPE_APP_INSTALL_URL } = env.data;

  const STRIPE_APP_INSTALL_URL = (await get("stripeAppUrl"))![
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? "production"
      : "development"
  ];

  const url = new URL(STRIPE_APP_INSTALL_URL);
  url.searchParams.set(
    "redirect_uri",
    `${APP_DOMAIN_WITH_NGROK}/api/stripe/connect/callback`,
  );
  url.searchParams.set("state", state);

  return url.toString();
};

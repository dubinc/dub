import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

const envSchema = z.object({
  STRIPE_APP_INSTALL_URL: z.string(),
  STRIPE_APP_CLIENT_ID: z.string(),
  STRIPE_APP_REDIRECT_URI: z.string(),
  STRIPE_APP_WEBHOOK_SECRET: z.string(),
});

export const POST = withWorkspace(async ({ workspace }) => {
  const state = nanoid(16);
  await redis.set(`stripe:install:state:${state}`, workspace.id, {
    ex: 5 * 60,
  });

  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new DubApiError({
      code: "bad_request",
      message: "Stripe environment variables are not configured properly.",
    });
  }

  const {
    STRIPE_APP_INSTALL_URL,
    STRIPE_APP_CLIENT_ID,
    STRIPE_APP_REDIRECT_URI,
  } = env.data;

  const url = new URL(STRIPE_APP_INSTALL_URL);
  url.searchParams.set("client_id", STRIPE_APP_CLIENT_ID);
  url.searchParams.set("redirect_uri", STRIPE_APP_REDIRECT_URI);
  url.searchParams.set("state", state);

  console.log("Redirecting to", url.toString());

  return NextResponse.json({ url: url.toString() });
});

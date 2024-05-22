import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK, nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

const envSchema = z.object({
  STRIPE_APP_INSTALL_URL: z.string(),
});

export const POST = withWorkspace(async ({ workspace }) => {
  const state = nanoid(16);
  await redis.set(`stripe:install:state:${state}`, workspace.id, {
    ex: 30 * 60,
  });

  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new DubApiError({
      code: "bad_request",
      message: "Stripe App environment variables are not configured properly.",
    });
  }

  const { STRIPE_APP_INSTALL_URL } = env.data;

  const url = new URL(STRIPE_APP_INSTALL_URL);
  url.searchParams.set(
    "redirect_uri",
    `${APP_DOMAIN_WITH_NGROK}/api/stripe/connect/callback`,
  );
  url.searchParams.set("state", state);

  return NextResponse.json({ url: url.toString() });
});

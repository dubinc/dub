import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK, nanoid } from "@dub/utils";

const envSchema = z.object({
  SLACK_APP_INSTALL_URL: z.string(),
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
});

// Get the installation URL for Slack
export const getSlackInstallationUrl = async (workspaceId: string) => {
  const state = nanoid(16);
  await redis.set(`slack:install:state:${state}`, workspaceId, {
    ex: 30 * 60,
  });

  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new Error(
      "Slack App environment variables are not configured properly.",
    );
  }

  const url = new URL(env.data.SLACK_APP_INSTALL_URL);
  url.searchParams.set(
    "redirect_uri",
    `${APP_DOMAIN_WITH_NGROK}/api/slack/callback`,
  );
  url.searchParams.set("state", state);

  return url.toString();
};

import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK, nanoid } from "@dub/utils";
import { getSlackEnv } from "./env";

// Get the installation URL for Slack
export const getSlackInstallationUrl = async (workspaceId: string) => {
  const env = getSlackEnv();

  const state = nanoid(16);
  await redis.set(`slack:install:state:${state}`, workspaceId, {
    ex: 30 * 60,
  });

  const url = new URL(env.SLACK_APP_INSTALL_URL);
  url.searchParams.set(
    "redirect_uri",
    `${APP_DOMAIN_WITH_NGROK}/api/slack/callback`,
  );
  url.searchParams.set("state", state);

  return url.toString();
};

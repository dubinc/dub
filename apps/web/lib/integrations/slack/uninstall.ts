import { DubApiError } from "@/lib/api/errors";
import { InstalledIntegration } from "@dub/prisma/client";
import { getSlackEnv } from "./env";
import { SlackCredential } from "./type";

export const uninstallSlackIntegration = async ({
  installation,
}: {
  installation: InstalledIntegration;
}) => {
  const env = getSlackEnv();
  const credentials = installation.credentials as SlackCredential;

  const response = await fetch("https://slack.com/api/apps.uninstall", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: credentials.accessToken,
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("[Slack App]", data);

    throw new DubApiError({
      code: "bad_request",
      message: "Failed to remove the app from the Slack workspace.",
    });
  }
};

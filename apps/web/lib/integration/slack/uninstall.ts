import { DubApiError } from "@/lib/api/errors";
import { InstalledIntegration } from "@prisma/client";
import { SlackCredential } from "./type";

export const uninstallSlackIntegration = async ({
  installation,
}: {
  installation: InstalledIntegration;
}) => {
  const credentials = installation.credentials as SlackCredential;

  const response = await fetch("https://slack.com/api/apps.uninstall", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: credentials.accessToken,
      client_id: `${process.env.SLACK_CLIENT_ID}`,
      client_secret: `${process.env.SLACK_CLIENT_SECRET}`,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new DubApiError({
      code: "bad_request",
      message: "Failed to remove the app from the Slack workspace.",
    });
  }
};

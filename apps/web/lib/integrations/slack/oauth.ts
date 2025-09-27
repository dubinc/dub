import { DubApiError } from "@/lib/api/errors";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { InstalledIntegration } from "@prisma/client";
import { OAuthProvider, OAuthProviderConfig } from "../oauth-provider";
import { SlackAuthToken } from "../types";
import { slackAuthTokenSchema } from "./schema";

class SlackOAuthProvider extends OAuthProvider<typeof slackAuthTokenSchema> {
  constructor(provider: OAuthProviderConfig) {
    super(provider);
  }

  async uninstall(installation: InstalledIntegration) {
    const credentials = installation.credentials as SlackAuthToken;

    const response = await fetch("https://slack.com/api/apps.uninstall", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: credentials.accessToken,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("[Slack]", data);

      throw new DubApiError({
        code: "bad_request",
        message: "Failed to remove the app from the Slack workspace.",
      });
    }
  }
}

export const slackOAuthProvider = new SlackOAuthProvider({
  name: "Slack",
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  authUrl: "https://slack.com/oauth/v2/authorize",
  tokenUrl: "https://slack.com/api/oauth.v2.access",
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/slack/callback`,
  redisStatePrefix: "slack:oauth:state",
  scopes: [
    "chat:write",
    "commands",
    "im:write",
    "channels:join",
    "chat:write.customize",
    "links:write",
    "users.profile:read",
    "users:read.email",
    "users:read",
    "incoming-webhook",
  ].join(","),
  tokenSchema: slackAuthTokenSchema,
  bodyFormat: "formdata",
});

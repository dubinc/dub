import { oauthCallbackServer } from "@/api/callback";
import { handleError } from "@/utils/handle-error";
import { OAuth2Client } from "@badgateway/oauth2-client";
import { Command } from "commander";
import * as dotenv from "dotenv";
import open from "open";
import ora from "ora";

dotenv.config();

const oauth2Client = new OAuth2Client({
  clientId: `${process.env.DUB_CLIENT_ID}`,
  clientSecret: `${process.env.DUB_CLIENT_SECRET}`,
  authorizationEndpoint: "https://app.dub.co/oauth/authorize",
  tokenEndpoint: "https://api.dub.co/oauth/token",
});

export const login = new Command()
  .name("login")
  .description("Log into the Dub platform")
  .action(async () => {
    try {
      const authUrl = await oauth2Client.authorizationCode.getAuthorizeUri({
        redirectUri: `${process.env.DUB_CALLBACK_URL}/callback`,
        scope: ["links.read", "links.write", "domains.read"],
      });

      const spinner = ora("Opening browser for authentication").start();

      await open(authUrl);

      spinner.text = "Waiting for authentication";

      oauthCallbackServer({
        oauth2Client,
        callbackUrl: process.env.DUB_CALLBACK_URL as string,
        spinner,
      });
    } catch (error) {
      handleError(error);
    }
  });

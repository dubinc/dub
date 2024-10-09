import { oauthCallbackServer } from "@/api/callback";
import { getNanoid } from "@/utils/get-nanoid";
import { handleError } from "@/utils/handle-error";
import { OAuth2Client } from "@badgateway/oauth2-client";
import { Command } from "commander";
import open from "open";
import ora from "ora";

const oauth2Client = new OAuth2Client({
  // TODO: add client id here
  clientId: "dub_app_adbe7acb08aea1f6e45a5d1fbe3a1a185822fc3cf50b527e",
  authorizationEndpoint: "https://app.dub.co/oauth/authorize",
  tokenEndpoint: "https://api.dub.co/oauth/token",
});

export const login = new Command()
  .name("login")
  .description("Log into the Dub platform")
  .action(async () => {
    try {
      const codeVerifier = getNanoid(64);
      const redirectUri = "http://localhost:4587/callback";

      const authUrl = await oauth2Client.authorizationCode.getAuthorizeUri({
        redirectUri,
        codeVerifier,
        scope: ["links.read", "links.write", "domains.read"],
      });

      const spinner = ora("Opening browser for authentication").start();

      await open(authUrl);

      spinner.text = "Waiting for authentication";

      oauthCallbackServer({
        oauth2Client,
        redirectUri,
        codeVerifier,
        spinner,
      });
    } catch (error) {
      handleError(error);
    }
  });

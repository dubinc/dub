import { oauthCallbackServer } from "@/api/callback";
import { getNanoid } from "@/utils/get-nanoid";
import { handleError } from "@/utils/handle-error";
import { oauthClient } from "@/utils/oauth";
import { Command } from "commander";
import open from "open";
import ora from "ora";

export const login = new Command()
  .name("login")
  .description("Log into the Dub platform")
  .action(async () => {
    try {
      const codeVerifier = getNanoid(64);
      const redirectUri = "http://localhost:4587/callback";

      const authUrl = await oauthClient.authorizationCode.getAuthorizeUri({
        redirectUri,
        codeVerifier,
        scope: ["links.read", "links.write", "domains.read"],
      });

      const spinner = ora("Opening browser for authentication").start();

      await open(authUrl);

      spinner.text = "Waiting for authentication";

      oauthCallbackServer({
        oauthClient,
        redirectUri,
        codeVerifier,
        spinner,
      });
    } catch (error) {
      handleError(error);
    }
  });

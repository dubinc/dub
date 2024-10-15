import { DubConfig } from "@/types";
import { setConfig } from "@/utils/config";
import { logger } from "@/utils/logger";
import { OAuth2Client } from "@badgateway/oauth2-client";
import chalk from "chalk";
import * as http from "http";
import { Ora } from "ora";
import * as url from "url";

interface OAuthCallbackServerProps {
  oauthClient: OAuth2Client;
  redirectUri: string;
  spinner: Ora;
  codeVerifier: string;
}

export function oauthCallbackServer({
  oauthClient,
  redirectUri,
  codeVerifier,
  spinner,
}: OAuthCallbackServerProps) {
  const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url || "", true);

    if (reqUrl.pathname !== "/callback" || req.method !== "GET") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = reqUrl.query.code as string;

    if (!code) {
      res.writeHead(400);
      res.end(
        "Authorization code not found. Please start the login process again.",
      );

      return;
    }

    try {
      spinner.text = "Verifying";

      const { accessToken, refreshToken, expiresAt } =
        await oauthClient.authorizationCode.getToken({
          code,
          redirectUri,
          codeVerifier,
        });

      spinner.text = "Configuring";

      const configInfo: DubConfig = {
        access_token: accessToken.trim(),
        refresh_token: refreshToken,
        expires_at: expiresAt ? Date.now() + expiresAt * 1000 : null,
        domain: "dub.sh",
      };

      await setConfig(configInfo);
      spinner.succeed("Configuration completed");

      logger.info("");
      logger.info(chalk.green("Logged in successfully!"));
      logger.info("");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("Authentication successful! You can close this window.");
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end("An error occurred during authentication. Please try again.");
    } finally {
      server.close();
      process.exit(0);
    }
  });

  setTimeout(() => {
    server.close();
    process.exit(0);
  }, 300000);

  server.listen(4587);
}

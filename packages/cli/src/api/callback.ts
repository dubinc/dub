import { DubConfig } from "@/types";
import { logger } from "@/utils/logger";
import { OAuth2Client } from "@badgateway/oauth2-client";
import chalk from "chalk";
import Configstore from "configstore";
import * as http from "http";
import { Ora } from "ora";
import * as url from "url";

interface OAuthCallbackServerProps {
  oauth2Client: OAuth2Client;
  callbackUrl: string;
  spinner: Ora;
}

export function oauthCallbackServer({
  oauth2Client,
  callbackUrl,
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

      const { accessToken } = await oauth2Client.authorizationCode.getToken({
        code,
        redirectUri: `${callbackUrl}/callback`,
      });

      spinner.text = "Configuring";

      const configInfo: DubConfig = {
        token: accessToken.trim(),
        domain: "dub.sh",
      };

      const config = new Configstore("dub-cli");
      config.set(configInfo);

      if (!config.path) {
        throw new Error("Failed to create config file");
      }

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

  server.listen(4040);
}

import { OAuth2Client } from "@badgateway/oauth2-client";

export const oauthClient = new OAuth2Client({
  // TODO: add client id here
  clientId: "dub_app_adbe7acb08aea1f6e45a5d1fbe3a1a185822fc3cf50b527e",
  authorizationEndpoint: "https://app.dub.co/oauth/authorize",
  tokenEndpoint: "https://api.dub.co/oauth/token",
});

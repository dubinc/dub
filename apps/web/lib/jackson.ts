import type {
  IConnectionAPIController,
  IDirectorySyncController,
  IOAuthController,
  JacksonOption,
} from "@boxyhq/saml-jackson";
import samlJackson from "@boxyhq/saml-jackson";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export const samlAudience = "https://saml.dub.co";

const opts: JacksonOption = {
  externalUrl:
    process.env.NODE_ENV === "production"
      ? "https://api.dub.co"
      : APP_DOMAIN_WITH_NGROK,
  samlPath:
    process.env.NODE_ENV === "production"
      ? "/auth/saml/callback"
      : "/api/auth/saml/callback",
  samlAudience,
  db: {
    engine: "planetscale",
    type: "mysql",
    url: process.env.DATABASE_URL as string,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  idpEnabled: true, // to allow folks to SSO directly from their IDP
  scimPath:
    process.env.NODE_ENV === "production" ? "/scim/v2.0" : "/api/scim/v2.0", // custom SCIM endpoint
  clientSecretVerifier: process.env.NEXTAUTH_SECRET as string,
};

declare global {
  var apiController: IConnectionAPIController | undefined;
  var oauthController: IOAuthController | undefined;
  var directorySyncController: IDirectorySyncController | undefined;
}

export async function jackson() {
  if (
    !globalThis.apiController ||
    !globalThis.oauthController ||
    !globalThis.directorySyncController
  ) {
    const ret = await samlJackson(opts);
    globalThis.apiController = ret.connectionAPIController;
    globalThis.oauthController = ret.oauthController;
    globalThis.directorySyncController = ret.directorySyncController;
  }

  return {
    apiController: globalThis.apiController,
    oauthController: globalThis.oauthController,
    directorySyncController: globalThis.directorySyncController,
  };
}

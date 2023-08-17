import jackson from "@boxyhq/saml-jackson";
import type {
  IConnectionAPIController,
  IOAuthController,
  JacksonOption,
  ISPSAMLConfig,
  IDirectorySyncController,
} from "@boxyhq/saml-jackson";

export const samlPath = "/api/auth/saml/callback";
export const samlAudience = "https://saml.dub.co";

const opts: JacksonOption = {
  externalUrl: process.env.NEXTAUTH_URL as string,
  samlPath,
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
  scimPath: "/api/scim/v2.0", // custom SCIM endpoint
  clientSecretVerifier: process.env.NEXTAUTH_SECRET as string,
};

declare global {
  var connectionController: IConnectionAPIController | undefined;
  var apiController: IConnectionAPIController | undefined;
  var oauthController: IOAuthController | undefined;
  var samlSPConfig: ISPSAMLConfig | undefined;
  var directorySyncController: IDirectorySyncController | undefined;
}

export default async function init() {
  if (
    !globalThis.connectionController ||
    !globalThis.apiController ||
    !globalThis.oauthController ||
    !globalThis.samlSPConfig ||
    !globalThis.directorySyncController
  ) {
    const ret = await jackson(opts);
    globalThis.connectionController = ret.connectionAPIController;
    globalThis.apiController = ret.connectionAPIController;
    globalThis.oauthController = ret.oauthController;
    globalThis.samlSPConfig = ret.spConfig;
    globalThis.directorySyncController = ret.directorySyncController;
  }

  return {
    connectionController: globalThis.connectionController,
    apiController: globalThis.apiController,
    oauthController: globalThis.oauthController,
    samlSPConfig: globalThis.samlSPConfig,
    directorySyncController: globalThis.directorySyncController,
  };
}

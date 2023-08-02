import jackson from "@boxyhq/saml-jackson";
import type {
  IConnectionAPIController,
  IOAuthController,
  JacksonOption,
  ISPSAMLConfig,
} from "@boxyhq/saml-jackson";

const samlAudience = "https://saml.dub.sh";
const samlPath = "/api/auth/saml/acs";

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
  idpEnabled: true,
  clientSecretVerifier: process.env.NEXTAUTH_SECRET as string,
};

declare global {
  var connectionController: IConnectionAPIController | undefined;
  var apiController: IConnectionAPIController | undefined;
  var oauthController: IOAuthController | undefined;
  var samlSPConfig: ISPSAMLConfig | undefined;
}

export default async function init() {
  if (
    !globalThis.connectionController ||
    !globalThis.apiController ||
    !globalThis.oauthController ||
    !globalThis.samlSPConfig
  ) {
    const ret = await jackson(opts);
    globalThis.connectionController = ret.connectionAPIController;
    globalThis.apiController = ret.connectionAPIController;
    globalThis.oauthController = ret.oauthController;
    globalThis.samlSPConfig = ret.spConfig;
  }

  return {
    connectionController: globalThis.connectionController,
    apiController: globalThis.apiController,
    oauthController: globalThis.oauthController,
    samlSPConfig: globalThis.samlSPConfig,
  };
}

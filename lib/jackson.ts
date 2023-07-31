import jackson from "@boxyhq/saml-jackson";
import type {
  IConnectionAPIController,
  IOAuthController,
  JacksonOption,
  ISPSAMLConfig,
} from "@boxyhq/saml-jackson";

const samlAudience = "https://saml.boxyhq.com";
const samlPath = "/api/auth/saml/acs";

const opts: JacksonOption = {
  externalUrl: process.env.NEXTAUTH_URL as string,
  samlAudience,
  samlPath,
  db: {
    engine: "sql",
    type: "mysql",
    url: process.env.DATABASE_URL as string,
  },
  idpEnabled: true,
  clientSecretVerifier: process.env.NEXTAUTH_SECRET as string,
};

declare global {
  var connectionController: IConnectionAPIController | undefined;
  var oauthController: IOAuthController | undefined;
  var samlSPConfig: ISPSAMLConfig | undefined;
}

export default async function init() {
  if (
    !globalThis.connectionController ||
    !globalThis.oauthController ||
    !globalThis.samlSPConfig
  ) {
    const ret = await jackson(opts);
    globalThis.connectionController = ret.connectionAPIController;
    globalThis.oauthController = ret.oauthController;
    globalThis.samlSPConfig = ret.spConfig;
  }

  return {
    connectionController: globalThis.connectionController,
    oauthController: globalThis.oauthController,
    samlSPConfig: globalThis.samlSPConfig,
  };
}

import { isProduction } from "@/lib/api/environment";
import { Configuration, Environments } from "tremendous";

export const tremendousEnv = {
  TREMENDOUS_API_KEY: process.env.TREMENDOUS_API_KEY || "",
  TREMENDOUS_CAMPAIGN_ID: process.env.TREMENDOUS_CAMPAIGN_ID || "",
  TREMENDOUS_WEBHOOK_SECRET: process.env.TREMENDOUS_WEBHOOK_SECRET || "",
};

export const tremendousConfiguration = new Configuration({
  basePath: isProduction ? Environments.production : Environments.testflight,
  accessToken: tremendousEnv.TREMENDOUS_API_KEY,
});

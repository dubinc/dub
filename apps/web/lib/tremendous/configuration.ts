import { isProduction } from "@/lib/api/environment";
import { Configuration, Environments } from "tremendous";

export const tremendousEnv = {
  TREMENDOUS_API_KEY: process.env.TREMENDOUS_API_KEY || "",
};

export const tremendousConfiguration = new Configuration({
  basePath: isProduction ? Environments.production : Environments.testflight,
  accessToken: tremendousEnv.TREMENDOUS_API_KEY,
});

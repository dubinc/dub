import { Configuration, Environments } from "tremendous";

export const tremendousConfiguration = new Configuration({
  basePath: process.env.TREMENDOUS_API_KEY?.startsWith("TEST_")
    ? Environments.testflight
    : Environments.production,
  accessToken: process.env.TREMENDOUS_API_KEY,
});

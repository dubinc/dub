import { getDotsEnv } from "./env";

export function getEncodedCredentials() {
  const { DOTS_CLIENT_ID, DOTS_API_KEY } = getDotsEnv();

  return Buffer.from(`${DOTS_CLIENT_ID}:${DOTS_API_KEY}`).toString("base64");
}

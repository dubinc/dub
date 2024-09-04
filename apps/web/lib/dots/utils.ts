import { DOTS_API_KEY, DOTS_CLIENT_ID } from "./constants";

export function getEncodedCredentials() {
  return Buffer.from(`${DOTS_CLIENT_ID}:${DOTS_API_KEY}`).toString("base64");
}

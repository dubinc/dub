import { Context } from "hono";

import { DubApiError } from "./errors";

export const extractApiKey = (c: Context) => {
  const authorizationHeader = c.req.header("Authorization");

  if (!authorizationHeader) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Missing the Authorization header. Did you forget to set the Authorization header?",
    });
  }

  if (!authorizationHeader.includes("Bearer ")) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://dub.sh/auth ",
    });
  }

  const apiKey = authorizationHeader.replace("Bearer ", "");

  return apiKey;
};

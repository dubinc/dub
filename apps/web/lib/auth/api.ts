import { prisma } from "@/lib/prisma";
import { getSearchParams } from "@dub/utils";
import { DubApiError, handleAndReturnErrorResponse } from "../api/errors";
import { ratelimit } from "../upstash";
import { hashToken } from "./hash-token";

interface withApiAuthHandler {
  ({
    req,
    params,
    searchParams,
    headers,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
  }): Promise<Response>;
}

export const withApiAuth = (handler: withApiAuthHandler, {}: {} = {}) => {
  return async (
    req: Request,
    { params }: { params: Record<string, string> | undefined },
  ) => {
    const searchParams = getSearchParams(req.url);

    let headers = {};

    try {
      const authorizationHeader = req.headers.get("Authorization");
      if (authorizationHeader) {
        if (!authorizationHeader.includes("Bearer ")) {
          throw new DubApiError({
            code: "bad_request",
            message:
              "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
          });
        }
        const apiKey = authorizationHeader.replace("Bearer ", "");

        const hashedKey = await hashToken(apiKey);

        const token = await prisma.token.findUnique({
          where: {
            hashedKey,
          },
        });
        if (!token) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Invalid API key.",
          });
        }

        const { success, limit, reset, remaining } = await ratelimit(
          600,
          "1 m",
        ).limit(apiKey);

        headers = {
          "Retry-After": reset.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        };

        if (!success) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Too many requests.",
          });
        }

        // record usage for analytics
        // record last used

        return await handler({
          req,
          params: params || {},
          searchParams,
          headers,
        });
      }
    } catch (error) {
      return handleAndReturnErrorResponse(error, headers);
    }
  };
};

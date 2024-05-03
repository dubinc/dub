import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { hashToken } from "@/lib/auth/hash";
import { getSearchParams } from "@dub/utils";
import { getToken, updateTokenLastUsed } from "../planetscale";
import { ratelimit } from "../upstash";
import { WithSessionHandler } from "./session";

export const withSessionEdge =
  (handler: WithSessionHandler) =>
  async (req: Request, { params }: { params: Record<string, string> }) => {
    let headers = {};
    const authorizationHeader = req.headers.get("Authorization");

    try {
      if (!authorizationHeader) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Missing authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
        });
      }

      if (authorizationHeader) {
        if (!authorizationHeader.includes("Bearer ")) {
          throw new DubApiError({
            code: "bad_request",
            message:
              "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
          });
        }
      }

      const apiKey = authorizationHeader.replace("Bearer ", "");
      const hashedKey = await hashToken(apiKey, { noSecret: true });
      const user = await getToken(hashedKey);

      if (!user) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Unauthorized: Invalid API key.",
        });
      }

      // Check rate limit
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

      // Update token last used
      await updateTokenLastUsed(hashedKey);

      const session = {
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
        },
      };

      // Fetch search params
      const searchParams = getSearchParams(req.url);

      return await handler({ req, params, searchParams, session });
    } catch (error) {
      return handleAndReturnErrorResponse(error, headers);
    }
  };

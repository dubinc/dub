import { WithSessionHandler, hashToken } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import { getSearchParams } from "@dub/utils";
import { DubApiError, handleAndReturnErrorResponse } from "../api/errors";
import { getUserFromApiKeyViaEdge, updateApiKeyViaEdge } from "../planetscale";

export const withSessionEdge =
  (handler: WithSessionHandler) =>
  async (
    req: Request,
    { params }: { params: Record<string, string> | undefined },
  ) => {
    try {
      const authorizationHeader = req.headers.get("Authorization");
      if (!authorizationHeader || !authorizationHeader.includes("Bearer ")) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
        });
      }

      const apiKey = authorizationHeader.replace("Bearer ", "");
      const hashedKey = hashToken(apiKey, {
        noSecret: true,
      });

      console.log("hashedKey", hashedKey);

      const user = await getUserFromApiKeyViaEdge(hashedKey);

      if (!user) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Unauthorized: Invalid API key.",
        });
      }

      const { success, limit, reset, remaining } = await ratelimit(
        10,
        "1 s",
      ).limit(apiKey);

      const headers = {
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

      await updateApiKeyViaEdge(hashedKey, new Date());
      const session = {
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
        },
      };
      console.log("session", session);

      return handler({
        req,
        params: params || {},
        searchParams: getSearchParams(req.url),
        session,
      });
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  };

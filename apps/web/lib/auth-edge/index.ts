import { NextRequest } from "next/server";
import { getSearchParams } from "@dub/utils";
import { Session, hashToken } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import { getUserFromApiKeyViaEdge, updateApiKeyViaEdge } from "../planetscale";

interface WithAuthHandler {
  ({
    req,
    params,
    searchParams,
    headers,
    session,
  }: {
    req: NextRequest;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
    session: Session;
  }): Promise<Response>;
}

export const withAuthEdge =
  (handler: WithAuthHandler, {}) =>
  async (
    req: NextRequest,
    { params }: { params: Record<string, string> | undefined },
  ) => {
    const authorizationHeader = req.headers.get("Authorization");
    if (!authorizationHeader || !authorizationHeader.includes("Bearer ")) {
      return new Response(
        "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://dub.sh/auth ",
        {
          status: 400,
        },
      );
    }

    const apiKey = authorizationHeader.replace("Bearer ", "");
    const hashedKey = hashToken(apiKey, {
      noSecret: true,
    });

    console.log('hashedKey', hashedKey)

    const user = await getUserFromApiKeyViaEdge(hashedKey);
    console.log('user', user)
    if (!user) {
      return new Response("Unauthorized: Invalid API key.", {
        status: 401,
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
      return new Response("Too many requests.", {
        status: 429,
        headers,
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
    console.log('session', session)

    return handler({
      req,
      params: params || {},
      searchParams: getSearchParams(req.url),
      headers,
      session,
    });
  };

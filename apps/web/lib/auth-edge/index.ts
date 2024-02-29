import { NextRequest } from "next/server";
import { getSearchParams } from "@dub/utils";
import { Session, hashToken } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";

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
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response("Unauthorized: Missing API key.", {
        status: 401,
      });
    }
    const hashedKey = hashToken(apiKey, {
      noSecret: true,
    });

    const user = await prisma.user.findFirst({
      where: {
        tokens: {
          some: {
            hashedKey,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
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
    await prisma.token.update({
      where: {
        hashedKey,
      },
      data: {
        lastUsed: new Date(),
      },
    });
    const session = {
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
      },
    };

    return handler({
      req,
      params: params || {},
      searchParams: getSearchParams(req.url),
      headers,
      session,
    });
  };

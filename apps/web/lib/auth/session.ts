import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { ratelimit, redis } from "@/lib/upstash";
import { getSearchParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { withAxiom } from "../axiom/server";
import { getServerSession } from "../better-auth/get-session";
import { hashToken } from "./hash-token";
import { Session } from "./utils";

type SessionUser = Session["user"];

type AuthMethod = "apiKey" | "session";

const RATELIMIT_POLICIES: Record<
  AuthMethod,
  { limit: number; interval: `${number} s` | `${number} m` }
> = {
  apiKey: {
    limit: 60,
    interval: "1 m",
  },
  session: {
    limit: 180,
    interval: "1 m",
  },
};

interface WithSessionHandler {
  ({
    req,
    params,
    searchParams,
    session,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    session: Session;
  }): Promise<Response>;
}

export const withSession = (handler: WithSessionHandler) =>
  withAxiom(
    async (
      req,
      { params: initialParams }: { params: Promise<Record<string, string>> },
    ) => {
      const params = (await initialParams) || {};
      const requestHeaders = await headers();
      const authorizationHeader = requestHeaders.get("Authorization");

      let responseHeaders = new Headers();
      let user: SessionUser | undefined;

      try {
        const result = authorizationHeader
          ? await authenticateApiKey(authorizationHeader)
          : await authenticateSession();

        user = result.user;

        if (!user) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Login required.",
          });
        }

        const response = await enforceRateLimit({
          identifier: result.rateLimitIdentifier,
          authMethod: result.authMethod,
        });

        responseHeaders = response.headers;

        if (!response.success) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Too many requests.",
          });
        }

        return await handler({
          req,
          params,
          searchParams: getSearchParams(req.url),
          session: { user },
        });
      } catch (error) {
        return handleAndReturnErrorResponse(error, responseHeaders);
      }
    },
  );

// Authenticate request via API key
async function authenticateApiKey(authHeader: string): Promise<{
  user: SessionUser;
  authMethod: "apiKey";
  rateLimitIdentifier: string;
}> {
  if (!authHeader.startsWith("Bearer ")) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
    });
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const hashedKey = await hashToken(apiKey);

  const token = await prisma.token.findUnique({
    where: {
      hashedKey,
    },
    select: {
      expires: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isMachine: true,
          defaultWorkspace: true,
          defaultPartnerId: true,
        },
      },
    },
  });

  if (!token?.user?.email) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized: Invalid API key.",
    });
  }

  if (token.expires && token.expires < new Date()) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized: Access token expired.",
    });
  }

  const { user } = token;

  return {
    authMethod: "apiKey",
    rateLimitIdentifier: apiKey,
    user: {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      image: user.image,
      isMachine: user.isMachine,
      defaultWorkspace: user.defaultWorkspace,
      defaultPartnerId: user.defaultPartnerId,
    },
  };
}

// Authenticate request via session
async function authenticateSession(): Promise<{
  user: SessionUser;
  authMethod: "session";
  rateLimitIdentifier: string;
}> {
  const result = await getServerSession();

  if (!result.session || !result.user?.email) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized: Login required.",
    });
  }

  const user: SessionUser = {
    id: result.user.id,
    name: result.user.name || "",
    email: result.user.email,
    image: result.user.image ?? null,
    isMachine: result.user.isMachine ?? false,
    defaultWorkspace: result.user.defaultWorkspace ?? null,
    defaultPartnerId: result.user.defaultPartnerId ?? null,
  };

  return {
    rateLimitIdentifier: result.user.id,
    authMethod: "session",
    user,
  };
}

// Enforce rate limit
async function enforceRateLimit({
  identifier,
  authMethod,
}: {
  identifier: string;
  authMethod: AuthMethod;
}) {
  const policyConfig = RATELIMIT_POLICIES[authMethod];

  const { success, limit, reset, remaining } = await ratelimit(
    policyConfig.limit,
    policyConfig.interval,
  ).limit(identifier);

  const headers = new Headers();

  headers.set("Retry-After", reset.toString());
  headers.set("X-RateLimit-Limit", limit.toString());
  headers.set("X-RateLimit-Remaining", remaining.toString());
  headers.set("X-RateLimit-Reset", reset.toString());

  if (authMethod === "apiKey" && success) {
    waitUntil(updateApiKeyLastUsed(identifier));
  }

  return {
    success,
    headers,
  };
}

// Update last used time for the token (only once every minute)
async function updateApiKeyLastUsed(apiKey: string) {
  const hashedKey = await hashToken(apiKey);

  const acquired = await redis.set(`last-used:${hashedKey}`, "1", {
    nx: true,
    ex: 60,
  });

  if (!acquired) {
    return;
  }

  await prisma.token.update({
    where: {
      hashedKey,
    },
    data: {
      lastUsed: new Date(),
    },
  });
}

import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { decode } from "next-auth/jwt";

import { prisma } from "@dub/database";
import { API_DOMAIN, hashToken } from "@dub/utils";
import { DubApiError } from "../errors";
import { HonoEnv } from "../hono";

declare module "next-auth/jwt" {
  interface JWT {
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }
}

export const authenticate = () => {
  return async (c: Context, next: () => Promise<void>) => {
    let user: HonoEnv["Variables"]["user"];

    const authorizationHeader = c.req.header("Authorization");

    // Expecting a Bearer token
    if (authorizationHeader) {
      if (!authorizationHeader?.includes("Bearer ")) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://dub.sh/auth ",
        });
      }

      const apiKey = authorizationHeader.replace("Bearer ", "");

      const url = new URL(c.req.url || "", API_DOMAIN);

      if (url.pathname.includes("/stats")) {
        throw new DubApiError({
          code: "forbidden",
          message: "API access is not available for stats yet.",
        });
      }

      const hashedKey = hashToken(apiKey, {
        noSecret: true,
      });

      const userFound = await prisma.user.findFirst({
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

      if (!userFound || !userFound.id) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Unauthorized: Invalid API key.",
        });
      }

      user = {
        id: userFound.id,
        name: userFound.name,
        email: userFound.email,
        apiKey,
      };
    }

    // Expecting a session cookie
    else {
      const sessionToken = getCookie(c, "next-auth.session-token");

      if (!sessionToken) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Login required.",
        });
      }

      const token = await decode({
        token: sessionToken,
        secret: "e0b76b1be35120c974b4bb152e312ff7", // TODO: Read this from env
      });

      if (!token || !token.user || !token.user.id) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Login required. Session expired.",
        });
      }

      user = token.user;
    }

    c.set("user", user);

    return await next();
  };
};

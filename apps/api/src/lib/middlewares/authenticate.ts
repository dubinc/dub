import { Context } from "hono";

import { prisma } from "@dub/database";
import { API_DOMAIN, hashToken } from "@dub/utils";
import { DubApiError } from "../error";

// Check if the request is authenticated with a valid API key
export const withAuth = async (c: Context, next: () => Promise<void>) => {
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
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized: Invalid API key.",
    });
  }

  // TODO: Add rate limiting

  await prisma.token.update({
    where: {
      hashedKey,
    },
    data: {
      lastUsed: new Date(),
    },
  });

  // TODO: Improve this
  const path = url.pathname.split("/").filter(Boolean);
  const projectSlug = c.req.param("projectSlug") || path[3];

  if (projectSlug) {
    const project = await prisma.project.findUniqueOrThrow({
      where: {
        slug: projectSlug,
      },
      include: {
        users: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
        domains: {
          select: {
            slug: true,
            primary: true,
          },
        },
      },
    });

    // console.log("projectSlug", projectSlug);
    // console.log("project", project);
  }

  c.set("user", user);

  await next();
};

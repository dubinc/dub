import { Context } from "hono";

import { prisma } from "@dub/database";
import { API_DOMAIN, hashToken } from "@dub/utils";
import { extractApiKey } from "../apikey";
import { DubApiError } from "../errors";

// Check if the request is authenticated with a valid API key
export const apiKeyValidator = async (c: Context, next: () => Promise<void>) => {
  const apiKey = extractApiKey(c);

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

  c.set("user", user);

  await next();
};

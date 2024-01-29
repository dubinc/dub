import { Context } from "hono";

import { prisma } from "@dub/database";
import { ratelimit } from "@dub/upstash";
import { hashToken } from "@dub/utils";
import { DubApiError } from "../errors";
import { HonoEnv } from "../hono";

export const rateLimit = () => {
  return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
    const apiKey = c.get("user")?.apiKey;

    if (apiKey) {
      const hashedKey = hashToken(apiKey, {
        noSecret: true,
      });

      const { success, limit, reset, remaining } = await ratelimit(
        10,
        "1 s",
      ).limit(apiKey);

      c.res.headers.set("Retry-After", reset.toString());
      c.res.headers.set("X-RateLimit-Limit", limit.toString());
      c.res.headers.set("X-RateLimit-Remaining", remaining.toString());
      c.res.headers.set("X-RateLimit-Reset", reset.toString());

      if (!success) {
        throw new DubApiError({
          code: "rate_limited",
          message: "Too many requests.",
        });
      }

      // TODO: Offload this to a background job
      await prisma.token.update({
        where: {
          hashedKey,
        },
        data: {
          lastUsed: new Date(),
        },
      });
    }

    return await next();
  };
};

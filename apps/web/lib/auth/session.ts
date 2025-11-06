import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { withAxiom } from "../axiom/server";
import { hashToken } from "./hash-token";
import { Session, getSession } from "./utils";

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
      let requestHeaders = await headers();
      let responseHeaders = new Headers();

      try {
        let session: Session | undefined;

        const authorizationHeader = requestHeaders.get("Authorization");
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
              isMachine: true,
            },
          });
          if (!user) {
            throw new DubApiError({
              code: "unauthorized",
              message: "Unauthorized: Invalid API key.",
            });
          }

          const { success, limit, reset, remaining } = await ratelimit(
            600,
            "1 m",
          ).limit(apiKey);

          responseHeaders.set("Retry-After", reset.toString());
          responseHeaders.set("X-RateLimit-Limit", limit.toString());
          responseHeaders.set("X-RateLimit-Remaining", remaining.toString());
          responseHeaders.set("X-RateLimit-Reset", reset.toString());

          if (!success) {
            throw new DubApiError({
              code: "rate_limit_exceeded",
              message: "Too many requests.",
            });
          }
          waitUntil(
            (async () => {
              try {
                // update last used time for the token (only once every minute)
                const { success } = await ratelimit(1, "1 m").limit(
                  `last-used-${hashedKey}`,
                );

                if (success) {
                  await prisma.token.update({
                    where: {
                      hashedKey,
                    },
                    data: {
                      lastUsed: new Date(),
                    },
                  });
                }
              } catch (error) {
                console.error(error);
              }
            })(),
          );
          session = {
            user: {
              id: user.id,
              name: user.name || "",
              email: user.email || "",
              isMachine: user.isMachine,
            },
          };
        } else {
          session = await getSession();
          if (!session?.user.id) {
            throw new DubApiError({
              code: "unauthorized",
              message: "Unauthorized: Login required.",
            });
          }
        }

        const searchParams = getSearchParams(req.url);
        return await handler({ req, params, searchParams, session });
      } catch (error) {
        return handleAndReturnErrorResponse(error, responseHeaders);
      }
    },
  );

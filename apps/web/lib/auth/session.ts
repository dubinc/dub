import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { getSearchParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
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
      req: AxiomRequest,
      { params = {} }: { params: Record<string, string> | undefined },
    ) => {
      try {
        let session: Session | undefined;
        let headers = {};

        const authorizationHeader = req.headers.get("Authorization");
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

          headers = {
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
          waitUntil(
            prisma.token.update({
              where: {
                hashedKey,
              },
              data: {
                lastUsed: new Date(),
              },
            }),
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
        req.log.error(error);
        return handleAndReturnErrorResponse(error);
      }
    },
  );

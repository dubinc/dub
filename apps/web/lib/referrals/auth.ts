import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { getSearchParams } from "@dub/utils";
import { Link, Project } from "@prisma/client";
import { AxiomRequest, withAxiom } from "next-axiom";
import { cookies } from "next/headers";
import { EMBED_PUBLIC_TOKEN_COOKIE_NAME } from "./constants";

interface WithAuthHandler {
  ({
    req,
    params,
    searchParams,
    workspace,
    link,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    workspace: Project;
    link: Link;
  }): Promise<Response>;
}

export const withAuth = (handler: WithAuthHandler) => {
  return withAxiom(
    async (
      req: AxiomRequest,
      { params = {} }: { params: Record<string, string> | undefined },
    ) => {
      let headers = {};

      try {
        let link: Link | undefined = undefined;

        const rateLimit = 60;
        const searchParams = getSearchParams(req.url);

        const cookieStore = cookies();
        const tokenFromCookie = cookieStore.get(
          EMBED_PUBLIC_TOKEN_COOKIE_NAME,
        )?.value;

        if (!tokenFromCookie) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Embed public token not found in the request.",
          });
        }

        const publicToken = await prisma.embedPublicToken.findUnique({
          where: {
            publicToken: tokenFromCookie,
          },
        });

        if (!publicToken) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Invalid public token.",
          });
        }

        if (publicToken.expires < new Date()) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Public token expired.",
          });
        }

        const { success, limit, reset, remaining } = await ratelimit(
          rateLimit,
          "1 m",
        ).limit(tokenFromCookie);

        headers = {
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

        link = await prisma.link.findUniqueOrThrow({
          where: {
            id: publicToken.linkId,
          },
        });

        if (!link.trackConversion) {
          throw new DubApiError({
            code: "forbidden",
            message: "Conversion tracking is not enabled for this link.",
          });
        }

        const workspace = await prisma.project.findUniqueOrThrow({
          where: {
            id: link.projectId!,
          },
        });

        return await handler({
          req,
          params,
          searchParams,
          workspace,
          link,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, headers);
      }
    },
  );
};

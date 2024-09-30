import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { getSearchParams } from "@dub/utils";
import { Link, Project } from "@prisma/client";
import { AxiomRequest, withAxiom } from "next-axiom";

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
        let publicToken: string | undefined = undefined;

        const rateLimit = 100;
        const searchParams = getSearchParams(req.url);
        const authorizationHeader = req.headers.get("Authorization");

        if (!authorizationHeader) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Missing Authorization header.",
          });
        }

        if (!authorizationHeader.includes("Bearer ")) {
          throw new DubApiError({
            code: "bad_request",
            message:
              "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
          });
        }

        publicToken = authorizationHeader.replace("Bearer ", "");

        if (!publicToken) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Missing Authorization header.",
          });
        }

        const referralToken = await prisma.referralPublicToken.findUnique({
          where: {
            publicToken,
          },
        });

        if (!referralToken) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Invalid public token.",
          });
        }

        if (referralToken.expires < new Date()) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Public token expired.",
          });
        }

        link = await prisma.link.findUniqueOrThrow({
          where: {
            id: referralToken.linkId,
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

        const { success, limit, reset, remaining } = await ratelimit(
          rateLimit,
          "1 m",
        ).limit(publicToken);

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

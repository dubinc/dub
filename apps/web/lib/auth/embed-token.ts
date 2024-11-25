import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { getSearchParams } from "@dub/utils";
import { Link, Program, Project } from "@prisma/client";
import { AxiomRequest, withAxiom } from "next-axiom";
import { cookies } from "next/headers";
import { EMBED_PUBLIC_TOKEN_COOKIE_NAME } from "../referrals/constants";
import { embedToken } from "../referrals/embed-token";

interface WithEmbedTokenHandler {
  ({
    req,
    params,
    searchParams,
    workspace,
    link,
    program,
    linkToken,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    workspace: Project;
    link: Link;
    program: Program;
    linkToken: string;
  }): Promise<Response>;
}

export const withEmbedToken = (handler: WithEmbedTokenHandler) => {
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

        const linkId = await embedToken.get(tokenFromCookie);

        if (!linkId) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Link token not found or expired.",
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
            id: linkId,
          },
        });

        if (!link.trackConversion) {
          throw new DubApiError({
            code: "forbidden",
            message: "Conversion tracking is not enabled for this link.",
          });
        }

        const [workspace, program] = await Promise.all([
          prisma.project.findUniqueOrThrow({
            where: {
              id: link.projectId!,
            },
          }),

          prisma.program.findFirstOrThrow({
            where: {
              workspaceId: link.projectId!,
            },
          }),
        ]);

        return await handler({
          req,
          params,
          searchParams,
          workspace,
          link,
          program,
          linkToken: tokenFromCookie,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, headers);
      }
    },
  );
};

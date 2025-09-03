import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Link, Program, ProgramEnrollment } from "@dub/prisma/client";
import { getSearchParams } from "@dub/utils";
import { AxiomRequest, withAxiom } from "next-axiom";
import { referralsEmbedToken } from "./token-class";

interface WithReferralsEmbedTokenHandler {
  ({
    req,
    params,
    searchParams,
    program,
    programEnrollment,
    links,
    embedToken,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    program: Program;
    programEnrollment: ProgramEnrollment;
    links: Link[];
    embedToken: string;
  }): Promise<Response>;
}

export const withReferralsEmbedToken = (
  handler: WithReferralsEmbedTokenHandler,
) => {
  return withAxiom(
    async (
      req: AxiomRequest,
      { params = {} }: { params: Record<string, string> | undefined },
    ) => {
      let headers = {};

      try {
        const rateLimit = 60;
        const searchParams = getSearchParams(req.url);
        const embedToken = req.headers.get("Authorization")?.split(" ")[1];

        if (!embedToken) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Embed public token not found in the request.",
          });
        }

        const { programId, partnerId } =
          (await referralsEmbedToken.get(embedToken)) ?? {};

        if (!programId || !partnerId) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Invalid embed public token.",
          });
        }

        const { success, limit, reset, remaining } = await ratelimit(
          rateLimit,
          "1 m",
        ).limit(embedToken);

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

        const { program, links, ...programEnrollment } =
          await prisma.programEnrollment.findUniqueOrThrow({
            where: {
              partnerId_programId: { partnerId, programId },
            },
            include: {
              links: {
                orderBy: [
                  {
                    saleAmount: "desc",
                  },
                  {
                    leads: "desc",
                  },
                  {
                    clicks: "desc",
                  },
                ],
              },
              program: true,
            },
          });

        return await handler({
          req,
          params,
          searchParams,
          program,
          programEnrollment,
          links,
          embedToken,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, headers);
      }
    },
  );
};

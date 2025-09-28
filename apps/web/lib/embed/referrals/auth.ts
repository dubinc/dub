import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { PartnerGroupProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Link, Program, ProgramEnrollment } from "@dub/prisma/client";
import { getSearchParams } from "@dub/utils";
import { AxiomRequest, withAxiom } from "next-axiom";
import { headers } from "next/headers";
import { referralsEmbedToken } from "./token-class";

interface WithReferralsEmbedTokenHandler {
  ({
    req,
    params,
    searchParams,
    program,
    programEnrollment,
    group,
    links,
    embedToken,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    program: Program;
    programEnrollment: ProgramEnrollment;
    group: PartnerGroupProps;
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
      { params: initialParams }: { params: Promise<Record<string, string>> },
    ) => {
      const params = (await initialParams) || {};
      const headersList = await headers();

      try {
        const rateLimit = 60;
        const searchParams = getSearchParams(req.url);
        const embedToken = headersList.get("Authorization")?.split(" ")[1];

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

        headersList.set("Retry-After", reset.toString());
        headersList.set("X-RateLimit-Limit", limit.toString());
        headersList.set("X-RateLimit-Remaining", remaining.toString());
        headersList.set("X-RateLimit-Reset", reset.toString());

        if (!success) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Too many requests.",
          });
        }

        const { program, links, partnerGroup, ...programEnrollment } =
          await prisma.programEnrollment.findUniqueOrThrow({
            where: {
              partnerId_programId: {
                partnerId,
                programId,
              },
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
              partnerGroup: true,
            },
          });

        if (!partnerGroup) {
          throw new DubApiError({
            code: "forbidden",
            message:
              "You’re not part of any group yet. Please reach out to the program owner to be added.",
          });
        }

        return await handler({
          req,
          params,
          searchParams,
          program,
          programEnrollment,
          group: partnerGroup as PartnerGroupProps,
          links,
          embedToken,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, headersList);
      }
    },
  );
};

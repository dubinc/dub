import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Link, Program } from "@dub/prisma/client";
import { getSearchParams } from "@dub/utils";
import { AxiomRequest, withAxiom } from "next-axiom";
import { cookies } from "next/headers";
import { REFERRALS_EMBED_PUBLIC_TOKEN_COOKIE_NAME } from "../constants";
import { referralsEmbedToken } from "./token-class";

interface WithReferralsEmbedTokenHandler {
  ({
    req,
    params,
    searchParams,
    program,
    programId,
    partnerId,
    links,
    embedToken,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    program: Program;
    programId: string;
    partnerId: string;
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

        const cookieStore = cookies();
        const tokenFromCookie = cookieStore.get(
          REFERRALS_EMBED_PUBLIC_TOKEN_COOKIE_NAME,
        )?.value;

        if (!tokenFromCookie) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Embed public token not found in the request.",
          });
        }

        const { programId, partnerId } =
          (await referralsEmbedToken.get(tokenFromCookie)) ?? {};

        if (!programId || !partnerId) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Invalid embed public token.",
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

        const programEnrollment =
          await prisma.programEnrollment.findUniqueOrThrow({
            where: {
              partnerId_programId: { partnerId, programId },
            },
            include: {
              links: true,
              program: true,
            },
          });

        return await handler({
          req,
          params,
          searchParams,
          program: programEnrollment.program,
          programId,
          partnerId: programEnrollment.partnerId,
          links: programEnrollment.links,
          embedToken: tokenFromCookie,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, headers);
      }
    },
  );
};

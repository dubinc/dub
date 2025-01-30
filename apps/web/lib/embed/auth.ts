import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Link, Program } from "@dub/prisma/client";
import { getSearchParams } from "@dub/utils";
import { AxiomRequest, withAxiom } from "next-axiom";
import { cookies } from "next/headers";
import { EMBED_PUBLIC_TOKEN_COOKIE_NAME } from "./constants";
import { embedToken } from "./embed-token";

interface WithEmbedTokenHandler {
  ({
    req,
    params,
    searchParams,
    program,
    programId,
    partnerId,
    tenantId,
    links,
    embedToken,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    program: Program;
    programId: string;
    partnerId: string;
    tenantId: string;
    links: Link[];
    embedToken: string;
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

        const { programId, tenantId } =
          (await embedToken.get(tokenFromCookie)) ?? {};

        if (!programId || !tenantId) {
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
              tenantId_programId: {
                tenantId,
                programId,
              },
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
          tenantId,
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

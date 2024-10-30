import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { PartnerProps } from "@/lib/types";
import { getSearchParams } from "@dub/utils";
import { AxiomRequest, withAxiom } from "next-axiom";
import { Session, getSession } from "./utils";

interface WithPartnerHandler {
  ({
    req,
    params,
    searchParams,
    headers,
    session,
    partner,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
    session: Session;
    partner: PartnerProps;
  }): Promise<Response>;
}

export const withPartner = (handler: WithPartnerHandler, {}: {} = {}) => {
  return withAxiom(
    async (
      req: AxiomRequest,
      { params = {} }: { params: Record<string, string> | undefined },
    ) => {
      try {
        const session = await getSession();

        if (!session?.user?.id) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Login required.",
          });
        }

        const searchParams = getSearchParams(req.url);
        const partnerId = params.partnerId || searchParams.partnerId;

        if (!partnerId) {
          throw new DubApiError({
            code: "bad_request",
            message: "Partner ID is required.",
          });
        }

        const partner = await prisma.partner.findUnique({
          where: {
            id: partnerId,
          },
          include: {
            users: {
              where: {
                userId: session.user.id,
              },
              select: {
                role: true,
              },
            },
          },
        });

        // partner profile doesn't exist
        if (!partner || !partner.users) {
          throw new DubApiError({
            code: "not_found",
            message: "Partner profile not found.",
          });
        }

        // partner profile exists but user is not part of it
        if (partner.users.length === 0) {
          throw new DubApiError({
            code: "not_found",
            message: "Partner profile not found.",
          });
        }

        return await handler({
          req,
          params,
          searchParams,
          session,
          partner,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error);
      }
    },
  );
};

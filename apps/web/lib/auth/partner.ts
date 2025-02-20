import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { AxiomRequest, withAxiom } from "next-axiom";
import { Session, getSession } from "./utils";

interface WithPartnerProfileHandler {
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

export const withPartnerProfile = (
  handler: WithPartnerProfileHandler,
  {}: {} = {},
) => {
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
        const { defaultPartnerId, id: userId } = session.user;

        const partner = await prisma.partner.findFirst({
          where: {
            ...(defaultPartnerId && {
              id: defaultPartnerId,
            }),
            users: {
              some: {
                userId,
              },
            },
          },
          include: {
            users: true,
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

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

export const withPartnerProfile = (handler: WithPartnerProfileHandler) => {
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

        if (!defaultPartnerId) {
          throw new DubApiError({
            code: "not_found",
            message: "Partner profile not found.",
          });
        }

        const partnerUser = await prisma.partnerUser.findUnique({
          where: {
            userId_partnerId: {
              userId,
              partnerId: defaultPartnerId,
            },
          },
          include: {
            partner: {
              include: {
                industryInterests: true,
                preferredEarningStructures: true,
                salesChannels: true,
              },
            },
          },
        });

        // partnerUser relationship doesn't exist
        if (!partnerUser) {
          throw new DubApiError({
            code: "not_found",
            message: "Partner profile not found.",
          });
        }

        const {
          industryInterests,
          preferredEarningStructures,
          salesChannels,
          ...partner
        } = partnerUser.partner;

        return await handler({
          req,
          params,
          searchParams,
          session,
          partner: {
            ...partner,
            industryInterests: industryInterests.map(
              ({ industryInterest }) => industryInterest,
            ),
            preferredEarningStructures: preferredEarningStructures.map(
              ({ preferredEarningStructure }) => preferredEarningStructure,
            ),
            salesChannels: salesChannels.map(
              ({ salesChannel }) => salesChannel,
            ),
          } as PartnerProps,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error);
      }
    },
  );
};

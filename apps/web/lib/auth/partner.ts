import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { getSearchParams, PARTNERS_DOMAIN } from "@dub/utils";
import { PartnerUser } from "@prisma/client";
import { Permission } from "./partner-users/partner-user-permissions";
import { throwIfNoPermission } from "./partner-users/throw-if-no-permission";
import { rateLimitRequest } from "./rate-limit-request";
import { getSession, Session } from "./utils";

interface WithPartnerProfileHandler {
  ({
    req,
    params,
    searchParams,
    headers,
    session,
    partner,
    partnerUser,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Headers;
    session: Session;
    partner: Omit<PartnerProps, "role" | "userId">;
    partnerUser: Pick<PartnerUser, "userId" | "role">;
  }): Promise<Response>;
}

interface WithPartnerProfileOptions {
  requiredPermission?: Permission;
}

export const RATE_LIMIT = {
  api: {
    limit: 15,
    interval: "1 s",
  },
  analyticsApi: {
    limit: 5,
    interval: "1 s",
  },
} as const;

export const withPartnerProfile = (
  handler: WithPartnerProfileHandler,
  { requiredPermission }: WithPartnerProfileOptions = {},
) => {
  return withAxiom(
    async (
      req,
      { params: initialParams }: { params: Promise<Record<string, string>> },
    ) => {
      const params = (await initialParams) || {};
      let responseHeaders = new Headers();

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

        // Check API rate limit
        const url = new URL(req.url || "", PARTNERS_DOMAIN);
        const isAnalytics =
          url.pathname.includes("/analytics") ||
          url.pathname.includes("/events");

        const rateLimit = RATE_LIMIT[isAnalytics ? "analyticsApi" : "api"];

        const { success, headers } = await rateLimitRequest({
          requests: rateLimit.limit,
          interval: rateLimit.interval,
          identifier: `partner-profile:ratelimit:${session.user.id}`,
        });

        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            responseHeaders.set(key, value);
          }
        }

        if (!success) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Too many requests.",
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

        if (requiredPermission) {
          throwIfNoPermission({
            role: partnerUser.role,
            permission: requiredPermission,
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
          } as Omit<PartnerProps, "role" | "userId">,
          partnerUser: {
            userId: partnerUser.userId,
            role: partnerUser.role,
          },
          headers: responseHeaders,
        });
      } catch (error) {
        return handleAndReturnErrorResponse(error, responseHeaders);
      }
    },
  );
};

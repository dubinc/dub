import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { getSearchParams, PARTNERS_DOMAIN } from "@dub/utils";
import { PartnerUser } from "@prisma/client";
import { AxiomRequest, withAxiom } from "next-axiom";
import { ratelimit } from "../upstash/ratelimit";
import { Permission, throwIfNoPermission } from "./partner-user-permissions";
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
    headers?: Record<string, string>;
    session: Session;
    partner: Omit<PartnerProps, "role" | "userId">;
    partnerUser: Pick<PartnerUser, "userId" | "role">;
  }): Promise<Response>;
}

interface WithPartnerProfileOptions {
  requiredPermission?: Permission;
}

export const RATE_LIMIT = {
  global: {
    limit: 20,
    interval: "1 s",
  },
  analytics: {
    limit: 10,
    interval: "1 s",
  },
} as const;

export const withPartnerProfile = (
  handler: WithPartnerProfileHandler,
  { requiredPermission }: WithPartnerProfileOptions = {},
) => {
  return withAxiom(
    async (
      req: AxiomRequest,
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

        const rateLimit = RATE_LIMIT[isAnalytics ? "analytics" : "global"];

        const { success, limit, reset, remaining } = await ratelimit(
          rateLimit.limit,
          rateLimit.interval,
        ).limit(`partner-profile:${defaultPartnerId}:${session.user.id}`);

        responseHeaders.set("Retry-After", reset.toString());
        responseHeaders.set("X-RateLimit-Limit", limit.toString());
        responseHeaders.set("X-RateLimit-Remaining", remaining.toString());
        responseHeaders.set("X-RateLimit-Reset", reset.toString());

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
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, responseHeaders);
      }
    },
  );
};

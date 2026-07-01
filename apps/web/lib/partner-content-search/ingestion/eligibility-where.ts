import type { Prisma } from "@prisma/client";
import { PartnerContentPlatform } from "../types";
import type { PartnerContentIngestionMode } from "./payload-schemas";
import { PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS } from "./routes";

export function getIncrementalRefreshCutoff() {
  return new Date(
    Date.now() - PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS * 24 * 60 * 60 * 1000,
  );
}

// Shared platform-eligibility predicate (verified + incremental-recency rules),
// used by both the enumerate and enumerate/page routes.
export function buildEligiblePartnerPlatformWhere({
  mode,
  platforms,
}: {
  mode: PartnerContentIngestionMode;
  platforms: PartnerContentPlatform[];
}): Prisma.PartnerPlatformWhereInput {
  return {
    type: {
      in: platforms,
    },
    verifiedAt: {
      not: null,
    },
    ...(mode === "incremental" && {
      OR: [
        {
          contentLastFetchedAt: null,
        },
        {
          contentLastFetchedAt: {
            lt: getIncrementalRefreshCutoff(),
          },
        },
      ],
    }),
  };
}

// Partner-level eligibility for the enumerate route — composes
// buildEligiblePartnerPlatformWhere; gates on approved/trusted status.
export function buildEligiblePartnerWhere({
  mode,
  filter,
}: {
  mode: PartnerContentIngestionMode;
  filter: {
    partnerId?: string;
    partnerIds?: string[];
    platforms: PartnerContentPlatform[];
  };
}): Prisma.PartnerWhereInput {
  return {
    networkStatus: {
      in: ["approved", "trusted"],
    },
    ...(filter.partnerId && {
      id: filter.partnerId,
    }),
    ...(filter.partnerIds?.length && {
      id: {
        in: filter.partnerIds,
      },
    }),
    platforms: {
      some: buildEligiblePartnerPlatformWhere({
        mode,
        platforms: filter.platforms,
      }),
    },
  };
}

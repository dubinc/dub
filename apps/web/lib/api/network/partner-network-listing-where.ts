import { PlatformType, Prisma } from "@prisma/client";
import type { ReachTier } from "./reach-tiers";
import { reachTiersToRanges } from "./reach-tiers";

/** Query params shared by `/api/network/partners` and `/count` for listing. */
export type PartnerNetworkListingParams = {
  partnerIds?: string[];
  country?: string;
  platform?: PlatformType[];
};

export type PartnerNetworkListingParts = {
  listingPartnerBase: Omit<Prisma.PartnerWhereInput, "platforms">;
  listingPlatformSome?: Prisma.PartnerPlatformWhereInput;
};

function listingPlatformSomeFromParams({
  platform,
}: Pick<PartnerNetworkListingParams, "platform">):
  | Prisma.PartnerPlatformWhereInput
  | undefined {
  return platform && platform.length
    ? {
        verifiedAt: { not: null },
        type: { in: platform },
      }
    : undefined;
}

export function partnerNetworkListingParts(
  params: PartnerNetworkListingParams,
): PartnerNetworkListingParts {
  const listingPlatformSome = listingPlatformSomeFromParams(params);

  return {
    listingPartnerBase: {
      networkStatus: { in: ["approved", "trusted"] },
      ...(params.partnerIds && {
        id: { in: params.partnerIds },
      }),
      ...(params.country && {
        country: params.country,
      }),
    },
    listingPlatformSome,
  };
}

export function partnerWhereFromListingParts(
  parts: PartnerNetworkListingParts,
): Prisma.PartnerWhereInput {
  return {
    ...parts.listingPartnerBase,
    ...(parts.listingPlatformSome && {
      platforms: {
        some: parts.listingPlatformSome,
      },
    }),
  };
}

export function partnerNetworkListingWhere(
  params: PartnerNetworkListingParams,
): Prisma.PartnerWhereInput {
  return partnerWhereFromListingParts(partnerNetworkListingParts(params));
}

// Reach tier filter: the partner's MAX subscriber count across verified platforms
// (optionally scoped to selected platform types) must fall in a chosen tier.
// "some platform >= min" AND "no scoped platform >= max" matches
// calculatePartnerRanking's MAX-subscribers semantics.
export function partnerReachWhere({
  reach,
  platform,
}: {
  reach?: ReachTier[];
  platform?: PlatformType[];
}): Prisma.PartnerWhereInput {
  if (!reach?.length) return {};

  const ranges = reachTiersToRanges(reach);
  const platformScope: Prisma.PartnerPlatformWhereInput = {
    verifiedAt: { not: null },
    ...(platform?.length && { type: { in: platform } }),
  };

  return {
    OR: ranges.map(({ min, max }) => ({
      AND: [
        {
          platforms: {
            some: {
              ...platformScope,
              subscribers: { gte: BigInt(min) },
            },
          },
        },
        ...(max != null
          ? [
              {
                platforms: {
                  none: {
                    ...platformScope,
                    subscribers: { gte: BigInt(max) },
                  },
                },
              },
            ]
          : []),
      ],
    })),
  };
}

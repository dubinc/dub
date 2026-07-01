import { PartnerNetworkStatus, PlatformType, Prisma } from "@prisma/client";
import type { ReachTier } from "./reach-tiers";
import { reachTiersToRanges } from "./reach-tiers";

// Partner network statuses that count as "discoverable" in the network. Ingestion
// only embeds partners in these statuses, and the discover listing + content-search
// hydrate filter on them. Single source of truth for the Prisma call sites; the raw
// $queryRaw paths (e.g. calculatePartnerRanking) keep their own inline literals.
export const DISCOVERABLE_NETWORK_STATUSES: PartnerNetworkStatus[] = [
  "approved",
  "trusted",
];

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
      networkStatus: { in: DISCOVERABLE_NETWORK_STATUSES },
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

// Reach-tier filter (see reach-tiers.ts). "some platform >= min AND no scoped
// platform >= max" is the WHERE-clause equivalent of calculatePartnerRanking's max.
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

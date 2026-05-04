import { PlatformType, Prisma } from "@dub/prisma/client";

/** Query params shared by `/api/network/partners` and `/count` for listing. */
export type PartnerNetworkListingParams = {
  partnerIds?: string[];
  country?: string;
  platform?: PlatformType;
  subscribers?: "<5000" | "5000-25000" | "25000-100000" | "100000+" | undefined;
};

export type PartnerNetworkListingParts = {
  listingPartnerBase: Omit<Prisma.PartnerWhereInput, "platforms">;
  listingPlatformSome?: Prisma.PartnerPlatformWhereInput;
};

function listingPlatformSomeFromParams({
  platform,
  subscribers,
}: Pick<PartnerNetworkListingParams, "platform" | "subscribers">):
  | Prisma.PartnerPlatformWhereInput
  | undefined {
  return platform || subscribers
    ? {
        verifiedAt: { not: null },
        ...(platform && { type: platform }),
        ...(subscribers === "<5000" && {
          subscribers: { lt: 5000 },
        }),
        ...(subscribers === "5000-25000" && {
          subscribers: { gte: 5000, lt: 25000 },
        }),
        ...(subscribers === "25000-100000" && {
          subscribers: { gte: 25000, lt: 100000 },
        }),
        ...(subscribers === "100000+" && {
          subscribers: { gte: 100000 },
        }),
      }
    : undefined;
}

export function partnerNetworkListingParts(
  params: PartnerNetworkListingParams,
): PartnerNetworkListingParts {
  const listingPlatformSome = listingPlatformSomeFromParams(params);

  return {
    listingPartnerBase: {
      discoverableAt: { not: null },
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

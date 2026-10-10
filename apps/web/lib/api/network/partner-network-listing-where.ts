import { PlatformType, Prisma } from "@prisma/client";

/** Query params shared by `/api/network/partners` and `/count` for listing. */
type PartnerNetworkListingParams = {
  partnerIds?: string[];
  country?: string;
  platform?: PlatformType;
};

type PartnerNetworkListingParts = {
  listingPartnerBase: Omit<Prisma.PartnerWhereInput, "platforms">;
  listingPlatformSome?: Prisma.PartnerPlatformWhereInput;
};

function listingPlatformSomeFromParams({
  platform,
}: Pick<PartnerNetworkListingParams, "platform">):
  | Prisma.PartnerPlatformWhereInput
  | undefined {
  return platform
    ? {
        verifiedAt: { not: null },
        ...(platform && { type: platform }),
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

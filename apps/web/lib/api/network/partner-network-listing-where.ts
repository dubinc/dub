import { PlatformType, Prisma } from "@dub/prisma/client";

/** Shared `PartnerWhereInput` for Partner Network tab counts and non-discover lists. */
export function partnerNetworkListingWhere({
  partnerIds,
  country,
  platform,
  subscribers,
}: {
  partnerIds?: string[];
  country?: string;
  platform?: PlatformType;
  subscribers?: "<5000" | "5000-25000" | "25000-100000" | "100000+" | undefined;
}): Prisma.PartnerWhereInput {
  const platformFilter: Prisma.PartnerPlatformWhereInput | undefined =
    platform || subscribers
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

  return {
    discoverableAt: { not: null },
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
    ...(country && {
      country,
    }),
    ...(platformFilter && {
      platforms: {
        some: platformFilter,
      },
    }),
  };
}

import { PartnerPlatformProps, PartnerProps } from "../types";

const SOCIAL_PLATFORM_TYPES = [
  "youtube",
  "instagram",
  "twitter",
  "linkedin",
  "tiktok",
] as const;

export function hasVerifiedSocialAccount(
  platforms: PartnerPlatformProps[],
): boolean {
  return platforms.some(
    (p) =>
      SOCIAL_PLATFORM_TYPES.includes(p.type as (typeof SOCIAL_PLATFORM_TYPES)[number]) &&
      p.verifiedAt !== null,
  );
}

export function isPartnerProfileComplete(
  partner: Pick<
    PartnerProps,
    | "name"
    | "country"
    | "profileType"
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
    | "industryInterests"
    | "platforms"
  >,
): boolean {
  return Boolean(
    partner.name &&
      partner.country &&
      partner.profileType &&
      partner.platforms.length > 0 &&
      partner.description &&
      partner.industryInterests?.length &&
      partner.monthlyTraffic &&
      partner.preferredEarningStructures?.length &&
      partner.salesChannels?.length,
  );
}

export function getMarketplaceRequirements({
  partner,
}: {
  partner: Pick<
    PartnerProps,
    | "name"
    | "country"
    | "profileType"
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
    | "industryInterests"
    | "platforms"
  >;
}) {
  return [
    {
      label: "Verify a connected social account",
      href: "#sites",
      completed: hasVerifiedSocialAccount(partner.platforms),
    },
    {
      label: "Complete your partner profile",
      href: "#about",
      completed: isPartnerProfileComplete(partner),
    },
  ];
}

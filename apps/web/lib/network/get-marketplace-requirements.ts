import { PartnerPlatformProps, PartnerProps } from "../types";

const SOCIAL_PLATFORM_TYPES = [
  "youtube",
  "instagram",
  "twitter",
  "linkedin",
  "tiktok",
] as const;

type MarketplacePartnerFields = Pick<
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

function isSocialPlatformType(
  type: string,
): type is (typeof SOCIAL_PLATFORM_TYPES)[number] {
  return SOCIAL_PLATFORM_TYPES.includes(
    type as (typeof SOCIAL_PLATFORM_TYPES)[number],
  );
}

export function hasVerifiedSocialAccount(
  platforms: PartnerPlatformProps[],
): boolean {
  return platforms.some(
    (p) => isSocialPlatformType(p.type) && p.verifiedAt !== null,
  );
}

export function isPartnerProfileComplete(
  partner: MarketplacePartnerFields,
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

export function canAccessMarketplace(
  partner: MarketplacePartnerFields,
): boolean {
  return (
    hasVerifiedSocialAccount(partner.platforms) &&
    isPartnerProfileComplete(partner)
  );
}

export function getMarketplaceRequirements({
  partner,
}: {
  partner: MarketplacePartnerFields;
}) {
  return [
    {
      label: "Verify a social account",
      href: "/profile#sites",
      completed: hasVerifiedSocialAccount(partner.platforms),
    },
    {
      label: "Complete your partner profile",
      href: "/profile#about",
      completed: isPartnerProfileComplete(partner),
    },
  ];
}

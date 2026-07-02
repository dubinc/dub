import type { Icon } from "@dub/ui/icons";
import {
  Globe,
  Instagram,
  LinkedIn,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui/icons";
import {
  getPrettyUrl,
  getUrlFromStringIfValid,
  nFormatter,
  pluralize,
} from "@dub/utils";
import { PlatformType } from "@prisma/client";
import { PLATFORM_ORDER, selectPrimaryPlatform } from "../social-utils";
import { PartnerPlatformProps } from "../types";

const PARTNER_PLATFORM_META: Record<
  PlatformType,
  { label: string; icon: Icon }
> = {
  website: { label: "Website", icon: Globe },
  youtube: { label: "YouTube", icon: YouTube },
  twitter: { label: "X/Twitter", icon: Twitter },
  linkedin: { label: "LinkedIn", icon: LinkedIn },
  instagram: { label: "Instagram", icon: Instagram },
  tiktok: { label: "Tiktok", icon: TikTok },
};

export const PARTNER_PLATFORM_FIELDS: {
  label: string;
  icon: Icon;
  data: (platforms: PartnerPlatformProps[]) => {
    value?: string | null;
    verified: boolean;
    verifiedAt?: Date | null;
    href?: string | null;
    info?: string[];
    stat?: string | null;
  };
}[] = PLATFORM_ORDER.map((type) => ({
  label: PARTNER_PLATFORM_META[type].label,
  icon: PARTNER_PLATFORM_META[type].icon,
  data: (platforms: PartnerPlatformProps[]) => {
    const platform = selectPrimaryPlatform(platforms, type);

    if (!platform) {
      return {
        value: null,
        verified: false,
        verifiedAt: null,
        href: null,
        info: [],
        stat: null,
      };
    }

    const { label, icon, ...data } = getPartnerPlatformDisplay(platform);

    return data;
  },
}));

// Builds the display data (value, link, stats) for a single platform handle.
export function getPartnerPlatformDisplay(platform: PartnerPlatformProps) {
  const { label, icon } = PARTNER_PLATFORM_META[platform.type];

  const verified = !!platform.verifiedAt;
  const verifiedAt = platform.verifiedAt ?? null;
  const subscribers = Number(platform.subscribers ?? 0);
  const posts = Number(platform.posts ?? 0);
  const views = Number(platform.views ?? 0);

  switch (platform.type) {
    case "website":
      return {
        label,
        icon,
        value: getPrettyUrl(platform.identifier),
        verified,
        verifiedAt,
        href: platform.identifier
          ? getUrlFromStringIfValid(platform.identifier)
          : null,
        info: [subscribers && verified ? `${subscribers} DR` : null].filter(
          Boolean,
        ) as string[],
        stat: subscribers && verified ? `${subscribers} DR` : null,
      };

    case "youtube":
      return {
        label,
        icon,
        value: platform.identifier ? `@${platform.identifier}` : null,
        verified,
        verifiedAt,
        href: platform.identifier
          ? `https://youtube.com/@${platform.identifier}`
          : null,
        info: [
          subscribers && verified
            ? `${nFormatter(subscribers)} ${pluralize("subscriber", subscribers)}`
            : null,
          views && verified
            ? `${nFormatter(views)} ${pluralize("view", views)}`
            : null,
        ].filter(Boolean) as string[],
        stat: subscribers && verified ? nFormatter(subscribers) : null,
      };

    case "twitter":
      return {
        label,
        icon,
        value: platform.identifier ? `@${platform.identifier}` : null,
        verified,
        verifiedAt,
        href: platform.identifier
          ? `https://x.com/${platform.identifier}`
          : null,
        info: [
          subscribers && verified
            ? `${nFormatter(subscribers)} ${pluralize("follower", subscribers)}`
            : null,
          posts && verified
            ? `${nFormatter(posts)} ${pluralize("tweet", posts)}`
            : null,
        ].filter(Boolean) as string[],
        stat: subscribers && verified ? nFormatter(subscribers) : null,
      };

    case "linkedin":
      return {
        label,
        icon,
        value: platform.identifier || null,
        verified,
        verifiedAt,
        href: platform.identifier
          ? `https://linkedin.com/in/${platform.identifier}`
          : null,
      };

    case "instagram":
      return {
        label,
        icon,
        value: platform.identifier ? `@${platform.identifier}` : null,
        verified,
        verifiedAt,
        href: platform.identifier
          ? `https://instagram.com/${platform.identifier}`
          : null,
        info: [
          subscribers && verified
            ? `${nFormatter(subscribers)} ${pluralize("follower", subscribers)}`
            : null,
          posts && verified
            ? `${nFormatter(posts)} ${pluralize("post", posts)}`
            : null,
        ].filter(Boolean) as string[],
        stat: subscribers && verified ? nFormatter(subscribers) : null,
      };

    case "tiktok":
      return {
        label,
        icon,
        value: platform.identifier ? `@${platform.identifier}` : null,
        verified,
        verifiedAt,
        href: platform.identifier
          ? `https://tiktok.com/@${platform.identifier}`
          : null,
        info: [
          subscribers && verified
            ? `${nFormatter(subscribers)} ${pluralize("follower", subscribers)}`
            : null,
          posts && verified
            ? `${nFormatter(posts)} ${pluralize("post", posts)}`
            : null,
        ].filter(Boolean) as string[],
        stat: subscribers && verified ? nFormatter(subscribers) : null,
      };
  }
}

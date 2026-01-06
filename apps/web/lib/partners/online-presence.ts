import type { Icon } from "@dub/ui/icons";
import {
  Globe,
  Instagram,
  LinkedIn,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui/icons";
import { getPrettyUrl, nFormatter } from "@dub/utils";
import { PartnerSocialPlatform } from "../types";

export const ONLINE_PRESENCE_FIELDS: {
  label: string;
  icon: Icon;
  data: (platforms: PartnerSocialPlatform[]) => {
    value?: string | null;
    verified: boolean;
    href?: string | null;
    info?: string[];
  };
}[] = [
  {
    label: "Website",
    icon: Globe,
    data: (platforms) => {
      const website = platforms.find((p) => p.platform === "website");

      return {
        value: website ? getPrettyUrl(website.handle) : null,
        verified: !!website?.verifiedAt,
        href: website?.handle,
      };
    },
  },
  {
    label: "YouTube",
    icon: YouTube,
    data: (platforms) => {
      const youtube = platforms.find((p) => p.platform === "youtube");

      return {
        value: youtube ? `@${youtube.handle}` : null,
        verified: !!youtube?.verifiedAt,
        href: `https://youtube.com/@${youtube?.handle}`,
        info: [
          youtube?.followers && youtube.followers > 0
            ? `${nFormatter(Number(youtube.followers))} subscribers`
            : null,
          youtube?.views && youtube.views > 0
            ? `${nFormatter(Number(youtube.views))} views`
            : null,
        ].filter(Boolean),
      };
    },
  },
  {
    label: "X/Twitter",
    icon: Twitter,
    data: (platforms) => {
      const twitter = platforms.find((p) => p.platform === "twitter");

      return {
        value: twitter ? `@${twitter.handle}` : null,
        verified: !!twitter?.verifiedAt,
        href: twitter?.handle ? `https://x.com/${twitter.handle}` : null,
      };
    },
  },
  {
    label: "LinkedIn",
    icon: LinkedIn,
    data: (platforms) => {
      const linkedin = platforms.find((p) => p.platform === "linkedin");

      return {
        value: linkedin ? linkedin.handle : null,
        verified: !!linkedin?.verifiedAt,
        href: linkedin?.handle
          ? `https://linkedin.com/in/${linkedin.handle}`
          : null,
      };
    },
  },
  {
    label: "Instagram",
    icon: Instagram,
    data: (platforms) => {
      const instagram = platforms.find((p) => p.platform === "instagram");

      return {
        value: instagram ? `@${instagram.handle}` : null,
        verified: !!instagram?.verifiedAt,
        href: instagram?.handle
          ? `https://instagram.com/${instagram.handle}`
          : null,
      };
    },
  },
  {
    label: "Tiktok",
    icon: TikTok,
    data: (platforms) => {
      const tiktok = platforms.find((p) => p.platform === "tiktok");

      return {
        value: tiktok ? `@${tiktok.handle}` : null,
        verified: !!tiktok?.verifiedAt,
        href: tiktok?.handle ? `https://tiktok.com/@${tiktok.handle}` : null,
      };
    },
  },
];

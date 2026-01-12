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
import { PartnerPlatformProps } from "../types";

export const ONLINE_PRESENCE_FIELDS: {
  label: string;
  icon: Icon;
  data: (platforms: PartnerPlatformProps[]) => {
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
      const website = platforms.find((p) => p.type === "website");

      return {
        value: website ? getPrettyUrl(website.identifier) : null,
        verified: !!website?.verifiedAt,
        href: website?.identifier,
      };
    },
  },
  {
    label: "YouTube",
    icon: YouTube,
    data: (platforms) => {
      const youtube = platforms.find((p) => p.type === "youtube");

      return {
        value: youtube?.identifier ? `@${youtube.identifier}` : null,
        verified: !!youtube?.verifiedAt,
        href: youtube?.identifier
          ? `https://youtube.com/@${youtube.identifier}`
          : null,
        info: [
          youtube?.subscribers && youtube.subscribers > 0
            ? `${nFormatter(Number(youtube.subscribers))} subscribers`
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
      const twitter = platforms.find((p) => p.type === "twitter");

      return {
        value: twitter ? `@${twitter.identifier}` : null,
        verified: !!twitter?.verifiedAt,
        href: twitter?.identifier
          ? `https://x.com/${twitter.identifier}`
          : null,
      };
    },
  },
  {
    label: "LinkedIn",
    icon: LinkedIn,
    data: (platforms) => {
      const linkedin = platforms.find((p) => p.type === "linkedin");

      return {
        value: linkedin ? linkedin.identifier : null,
        verified: !!linkedin?.verifiedAt,
        href: linkedin?.identifier
          ? `https://linkedin.com/in/${linkedin.identifier}`
          : null,
      };
    },
  },
  {
    label: "Instagram",
    icon: Instagram,
    data: (platforms) => {
      const instagram = platforms.find((p) => p.type === "instagram");

      return {
        value: instagram ? `@${instagram.identifier}` : null,
        verified: !!instagram?.verifiedAt,
        href: instagram?.identifier
          ? `https://instagram.com/${instagram.identifier}`
          : null,
      };
    },
  },
  {
    label: "Tiktok",
    icon: TikTok,
    data: (platforms) => {
      const tiktok = platforms.find((p) => p.type === "tiktok");

      return {
        value: tiktok ? `@${tiktok.identifier}` : null,
        verified: !!tiktok?.verifiedAt,
        href: tiktok?.identifier
          ? `https://tiktok.com/@${tiktok.identifier}`
          : null,
      };
    },
  },
];

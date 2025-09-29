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
import { EnrolledPartnerExtendedProps } from "../types";

export const ONLINE_PRESENCE_FIELDS: {
  label: string;
  icon: Icon;
  data: (
    partner: Pick<
      EnrolledPartnerExtendedProps,
      | "website"
      | "websiteVerifiedAt"
      | "youtube"
      | "youtubeSubscriberCount"
      | "youtubeVerifiedAt"
      | "youtubeViewCount"
      | "twitter"
      | "twitterVerifiedAt"
      | "linkedin"
      | "linkedinVerifiedAt"
      | "instagram"
      | "instagramVerifiedAt"
      | "tiktok"
      | "tiktokVerifiedAt"
    >,
  ) => {
    value?: string | null;
    verified: boolean;
    href?: string | null;
    info?: string[];
  };
}[] = [
  {
    label: "Website",
    icon: Globe,
    data: (partner) => ({
      value: partner.website ? getPrettyUrl(partner.website) : null,
      verified: !!partner.websiteVerifiedAt,
      href: partner.website,
    }),
  },
  {
    label: "YouTube",
    icon: YouTube,
    data: (partner) => ({
      value: partner.youtube ? `@${partner.youtube}` : null,
      verified: !!partner.youtubeVerifiedAt,
      href: `https://youtube.com/@${partner.youtube}`,
      info: [
        partner.youtubeSubscriberCount && partner.youtubeSubscriberCount > 0
          ? `${nFormatter(partner.youtubeSubscriberCount)} subscribers`
          : null,
        partner.youtubeViewCount && partner.youtubeViewCount > 0
          ? `${nFormatter(partner.youtubeViewCount)} views`
          : null,
      ].filter(Boolean),
    }),
  },
  {
    label: "X/Twitter",
    icon: Twitter,
    data: (partner) => ({
      value: partner.twitter ? `@${partner.twitter}` : null,
      verified: !!partner.twitterVerifiedAt,
      href: `https://x.com/${partner.twitter}`,
    }),
  },
  {
    label: "LinkedIn",
    icon: LinkedIn,
    data: (partner) => ({
      value: partner.linkedin,
      verified: !!partner.linkedinVerifiedAt,
      href: `https://linkedin.com/in/${partner.linkedin}`,
    }),
  },
  {
    label: "Instagram",
    icon: Instagram,
    data: (partner) => ({
      value: partner.instagram ? `@${partner.instagram}` : null,
      verified: !!partner.instagramVerifiedAt,
      href: `https://instagram.com/${partner.instagram}`,
    }),
  },
  {
    label: "Tiktok",
    icon: TikTok,
    data: (partner) => ({
      value: partner.tiktok ? `@${partner.tiktok}` : null,
      verified: !!partner.tiktokVerifiedAt,
      href: `https://tiktok.com/@${partner.tiktok}`,
    }),
  },
];

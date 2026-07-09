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
import { PartnerPlatformProps } from "../types";

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
}[] = [
  {
    label: "Website",
    icon: Globe,
    data: (platforms) => {
      const website = platforms.find((p) => p.type === "website");

      return {
        value: website ? getPrettyUrl(website.identifier) : null,
        verified: !!website?.verifiedAt,
        verifiedAt: website?.verifiedAt ?? null,
        href: website?.identifier
          ? getUrlFromStringIfValid(website.identifier)
          : null,
        info: [
          website?.subscribers && website?.verifiedAt
            ? `${Number(website.subscribers)} DR`
            : null,
        ].filter(Boolean),
        stat:
          website?.subscribers && website?.verifiedAt
            ? `${Number(website.subscribers)} DR`
            : null,
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
        verifiedAt: youtube?.verifiedAt ?? null,
        href: youtube?.identifier
          ? `https://youtube.com/@${youtube.identifier}`
          : null,
        info: [
          youtube?.subscribers && youtube?.verifiedAt
            ? `${nFormatter(Number(youtube.subscribers))} ${pluralize("subscriber", Number(youtube.subscribers))}`
            : null,
          youtube?.views && youtube?.verifiedAt
            ? `${nFormatter(Number(youtube.views))} ${pluralize("view", Number(youtube.views))}`
            : null,
        ].filter(Boolean),
        stat:
          youtube?.subscribers && youtube?.verifiedAt
            ? nFormatter(Number(youtube.subscribers))
            : null,
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
        verifiedAt: twitter?.verifiedAt ?? null,
        href: twitter?.identifier
          ? `https://x.com/${twitter.identifier}`
          : null,
        info: [
          twitter?.subscribers && twitter?.verifiedAt
            ? `${nFormatter(Number(twitter.subscribers))} ${pluralize("follower", Number(twitter.subscribers))}`
            : null,
          twitter?.posts && twitter?.verifiedAt
            ? `${nFormatter(Number(twitter.posts))} ${pluralize("tweet", Number(twitter.posts))}`
            : null,
        ].filter(Boolean),
        stat:
          twitter?.subscribers && twitter?.verifiedAt
            ? nFormatter(Number(twitter.subscribers))
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
        verifiedAt: linkedin?.verifiedAt ?? null,
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
        verifiedAt: instagram?.verifiedAt ?? null,
        href: instagram?.identifier
          ? `https://instagram.com/${instagram.identifier}`
          : null,
        info: [
          instagram?.subscribers && instagram?.verifiedAt
            ? `${nFormatter(Number(instagram.subscribers))} ${pluralize("follower", Number(instagram.subscribers))}`
            : null,
          instagram?.posts && instagram?.verifiedAt
            ? `${nFormatter(Number(instagram.posts))} ${pluralize("post", Number(instagram.posts))}`
            : null,
        ].filter(Boolean),
        stat:
          instagram?.subscribers && instagram?.verifiedAt
            ? nFormatter(Number(instagram.subscribers))
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
        verifiedAt: tiktok?.verifiedAt ?? null,
        href: tiktok?.identifier
          ? `https://tiktok.com/@${tiktok.identifier}`
          : null,
        info: [
          tiktok?.subscribers && tiktok?.verifiedAt
            ? `${nFormatter(Number(tiktok.subscribers))} ${pluralize("follower", Number(tiktok.subscribers))}`
            : null,
          tiktok?.posts && tiktok?.verifiedAt
            ? `${nFormatter(Number(tiktok.posts))} ${pluralize("post", Number(tiktok.posts))} `
            : null,
        ].filter(Boolean),
        stat:
          tiktok?.subscribers && tiktok?.verifiedAt
            ? nFormatter(Number(tiktok.subscribers))
            : null,
      };
    },
  },
];

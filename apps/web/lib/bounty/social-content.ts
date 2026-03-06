import { PlatformType } from "@dub/prisma/client";

export const BOUNTY_SOCIAL_PLATFORMS = [
  {
    value: "youtube",
    label: "YouTube",
    postType: "video",
    metrics: ["views", "likes"],
    placeholder: "https://www.youtube.com/watch?v=",
  },
  {
    value: "tiktok",
    label: "TikTok",
    postType: "video",
    metrics: ["views", "likes"],
    placeholder: "https://www.tiktok.com/@username/video/",
  },
  {
    value: "instagram",
    label: "Instagram",
    postType: "photo",
    metrics: ["likes", "views"],
    placeholder: "https://www.instagram.com/username/reel/",
  },
  {
    value: "twitter",
    label: "X/Twitter",
    postType: "tweet",
    metrics: ["likes", "views"],
    placeholder: "https://x.com/username/status/",
  },
] as const;

export const BOUNTY_SOCIAL_PLATFORM_VALUES = BOUNTY_SOCIAL_PLATFORMS.map(
  (p) => p.value,
);

export const BOUNTY_SOCIAL_PLATFORM_METRICS = BOUNTY_SOCIAL_PLATFORMS.map(
  (p) => p.metrics,
).flat();

export const BOUNTY_SOCIAL_PLATFORM_METRICS_MAP = Object.fromEntries(
  BOUNTY_SOCIAL_PLATFORMS.map((p) => [
    p.value,
    p.metrics.map((m) => ({
      value: m,
      label: m,
    })),
  ]),
);

export const SOCIAL_URL_HOST_TO_PLATFORM: Record<string, PlatformType> = {
  "youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "m.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "instagram.com": "instagram",
  "m.instagram.com": "instagram",
  "twitter.com": "twitter",
  "x.com": "twitter",
};

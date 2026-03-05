import { PlatformType } from "@dub/prisma/client";
import { isValidUrl } from "@dub/utils";
import { BountySocialPlatform } from "../types";

const SOCIAL_URL_HOST_TO_PLATFORM: Record<string, PlatformType> = {
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

export function getPlatformFromSocialUrl(url: string): PlatformType | null {
  const trimmed = url?.trim();

  if (!trimmed || !isValidUrl(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    return SOCIAL_URL_HOST_TO_PLATFORM[host] ?? null;
  } catch {
    return null;
  }
}

export function getSocialContentEmbedUrl({
  platform,
  url,
}: {
  platform: BountySocialPlatform;
  url: string;
}) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (platform === "youtube") {
      if (host === "youtu.be") {
        const id = parsed.pathname.slice(1).split("?")[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      if (host === "youtube.com" || host === "m.youtube.com") {
        const v = parsed.searchParams.get("v");

        if (v) {
          return `https://www.youtube.com/embed/${v}`;
        }

        const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?#]+)/);

        if (shortsMatch?.[1]) {
          return `https://www.youtube.com/embed/${shortsMatch[1]}`;
        }

        return null;
      }
    }

    if (platform === "instagram") {
      if (host === "instagram.com" || host === "m.instagram.com") {
        const pathMatch =
          parsed.pathname.match(/\/p\/([^/]+)/) ??
          parsed.pathname.match(/\/reel\/([^/]+)/);
        const shortcode = pathMatch?.[1];

        if (!shortcode) {
          return null;
        }

        const isReel = parsed.pathname.includes("/reel/");

        return isReel
          ? `https://www.instagram.com/reel/${shortcode}/embed/`
          : `https://www.instagram.com/p/${shortcode}/embed/`;
      }
    }

    if (platform === "tiktok") {
      if (
        host === "tiktok.com" ||
        host === "m.tiktok.com" ||
        host === "vm.tiktok.com"
      ) {
        const match = parsed.pathname.match(/\/video\/(\d+)/);
        const videoId = match?.[1];

        return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
      }
    }

    if (platform === "twitter") {
      if (host === "twitter.com" || host === "x.com") {
        const statusMatch = parsed.pathname.match(/\/status\/(\d+)/);
        const tweetId = statusMatch?.[1];
        return tweetId
          ? `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`
          : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function getSocialContentEmbedAspectRatio({
  platform,
  url,
}: {
  platform: BountySocialPlatform;
  url: string;
}): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    if (platform === "youtube") {
      return pathname.includes("/shorts/") ? "aspect-[9/16]" : "aspect-video";
    }

    if (platform === "tiktok") {
      return "aspect-[9/16]";
    }

    if (platform === "instagram") {
      return pathname.includes("/reel/") ? "aspect-[9/16]" : "aspect-square";
    }

    if (platform === "twitter") {
      return "aspect-square";
    }

    return "aspect-video";
  } catch {
    return "aspect-video";
  }
}

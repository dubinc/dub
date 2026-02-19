import { bountySocialContentRequirementsSchema } from "@/lib/zod/schemas/bounties";
import { PlatformType } from "@dub/prisma/client";
import { currencyFormatter, isValidUrl } from "@dub/utils";
import { BountySocialPlatform, PartnerBountyProps } from "../types";
import { BOUNTY_SOCIAL_PLATFORMS } from "./constants";

const SOCIAL_URL_HOST_TO_PLATFORM: Record<string, PlatformType> = {
  "youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "twitter.com": "twitter",
  "www.twitter.com": "twitter",
  "x.com": "twitter",
  "www.x.com": "twitter",
};

export function getPlatformFromSocialUrl(url: string): PlatformType | null {
  const trimmed = url?.trim();

  if (!trimmed || !isValidUrl(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    const withWww = parsed.hostname;

    return (
      SOCIAL_URL_HOST_TO_PLATFORM[host] ??
      SOCIAL_URL_HOST_TO_PLATFORM[withWww] ??
      null
    );
  } catch {
    return null;
  }
}

export function getBountySocialMetricsRequirements(bounty: {
  submissionRequirements?: unknown;
}) {
  const requirements = bounty.submissionRequirements;

  if (
    requirements == null ||
    typeof requirements !== "object" ||
    Array.isArray(requirements)
  ) {
    return null;
  }

  if (!("socialMetrics" in requirements)) {
    return null;
  }

  const parsed = bountySocialContentRequirementsSchema.safeParse(
    requirements.socialMetrics,
  );

  return parsed.success ? parsed.data : null;
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
      if (host === "instagram.com" || host === "www.instagram.com") {
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
      if (host === "tiktok.com" || host === "www.tiktok.com") {
        const match = parsed.pathname.match(/\/video\/(\d+)/);
        const videoId = match?.[1];

        return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
      }
    }

    if (platform === "twitter") {
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export function getBountySocialPlatform(bounty: {
  submissionRequirements?: unknown;
}) {
  const socialMetrics = getBountySocialMetricsRequirements(bounty);

  if (!socialMetrics) {
    return null;
  }

  return BOUNTY_SOCIAL_PLATFORMS.find(
    ({ value }) => value === socialMetrics.platform,
  );
}

export function getBountySubmissionRequirementTexts(
  bounty: Pick<PartnerBountyProps, "submissionRequirements">,
): string[] {
  const socialMetrics = getBountySocialMetricsRequirements(bounty);

  if (!socialMetrics) {
    return [];
  }

  const channel = getBountySocialPlatform(bounty);

  if (!channel) {
    return [];
  }

  return [
    `Submit a ${channel.label} link from your connected account`,
    "The content shared is posted after this bounty started",
  ];
}

export function getBountyRewardCriteriaTexts(
  bounty: PartnerBountyProps,
): string[] {
  const socialMetrics = getBountySocialMetricsRequirements(bounty);

  if (!socialMetrics) {
    return [];
  }

  const channel = getBountySocialPlatform(bounty);

  if (!channel || !bounty.rewardAmount) {
    return [];
  }

  const formattedAmount = currencyFormatter(bounty.rewardAmount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  const minCount = socialMetrics.minCount ?? 0;
  const texts: string[] = [
    `Get ${minCount} ${socialMetrics.metric} on your ${channel.postType}, earn ${formattedAmount}`,
  ];

  const variableBonus = socialMetrics.incrementalBonus;

  if (variableBonus) {
    const { incrementalAmount, bonusAmount, capAmount } = variableBonus;

    if (incrementalAmount && bonusAmount && capAmount) {
      const formattedBonus = currencyFormatter(bonusAmount, {
        trailingZeroDisplay: "stripIfInteger",
      });

      texts.push(
        `For each additional ${incrementalAmount} ${socialMetrics.metric} on your ${channel.postType}, earn ${formattedBonus}, up to ${capAmount} ${socialMetrics.metric}`,
      );
    }
  }

  return texts;
}

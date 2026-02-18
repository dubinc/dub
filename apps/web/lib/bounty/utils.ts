import { currencyFormatter } from "@dub/utils";
import { PartnerBountyProps } from "../types";
import { SOCIAL_METRICS_CHANNELS } from "./constants";

type SocialPlatformValue = "youtube" | "twitter" | "tiktok" | "instagram";

export function getSocialContentEmbedUrl({
  platform,
  url,
}: {
  platform: SocialPlatformValue;
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

export function getBountySocialPlatform(
  bounty: Pick<PartnerBountyProps, "submissionRequirements">,
) {
  const socialMetrics = bounty.submissionRequirements?.socialMetrics;

  if (!socialMetrics) {
    return null;
  }

  return SOCIAL_METRICS_CHANNELS.find(
    ({ value }) => value === socialMetrics.channel,
  );
}

export function getBountySubmissionRequirementTexts(
  bounty: Pick<PartnerBountyProps, "submissionRequirements">,
): string[] {
  const socialMetrics = bounty.submissionRequirements?.socialMetrics;

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
  const socialMetrics = bounty.submissionRequirements?.socialMetrics;

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

  const texts: string[] = [
    `Get ${socialMetrics.amount} ${socialMetrics.metric} on your ${channel.postType}, earn ${formattedAmount}`,
  ];

  const variableBonus = socialMetrics.variableBonus;

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

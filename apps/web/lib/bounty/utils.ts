import {
  BountySubmissionFrequency,
  PlatformType,
  Prisma,
} from "@dub/prisma/client";
import { currencyFormatter, isValidUrl } from "@dub/utils";
import { addDays, addMonths, addWeeks } from "date-fns";
import {
  BountySocialPlatform,
  BountySubmissionProps,
  PartnerBountyProps,
} from "../types";
import { bountySocialContentRequirementsSchema } from "../zod/schemas/bounties";
import { BOUNTY_SOCIAL_PLATFORMS } from "./constants";

export function getNextBountySubmissionEligibleAt({
  submissionFrequency,
  lastSubmissionAt,
}: {
  submissionFrequency: BountySubmissionFrequency;
  lastSubmissionAt: Date;
}): Date {
  switch (submissionFrequency) {
    case "day":
      return addDays(lastSubmissionAt, 1);
    case "week":
      return addWeeks(lastSubmissionAt, 1);
    case "month":
      return addMonths(lastSubmissionAt, 1);
    default:
      throw new Error("Invalid submission frequency");
  }
}

const SOCIAL_URL_HOST_TO_PLATFORM: Record<string, PlatformType> = {
  "youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "m.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "instagram.com": "instagram",
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
      if (host === "instagram.com") {
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

export function getBountySubmissionRequirementTexts(
  bounty: PartnerBountyProps,
): string[] {
  const bountyInfo = getBountyInfo(bounty);

  if (!bountyInfo?.hasSocialMetrics || !bountyInfo.socialPlatform) {
    return [];
  }

  return [
    `Submit a ${bountyInfo.socialPlatform.label} link from your connected account`,
    "The content shared is posted after this bounty started",
  ];
}

export function getBountyRewardCriteriaTexts(
  bounty: PartnerBountyProps,
): string[] {
  const bountyInfo = getBountyInfo(bounty);

  if (
    !bountyInfo?.socialMetrics ||
    !bountyInfo.socialPlatform ||
    !bountyInfo.rewardAmount
  ) {
    return [];
  }

  const formattedAmount = currencyFormatter(bountyInfo.rewardAmount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  const socialPlatform = bountyInfo.socialPlatform;
  const { minCount, metric, incrementalBonus } = bountyInfo.socialMetrics;

  const texts: string[] = [
    `Get ${minCount} ${metric} on your ${socialPlatform.label}, earn ${formattedAmount}`,
  ];

  if (incrementalBonus) {
    const { incrementCount, bonusPerIncrement, maxCount } = incrementalBonus;

    if (incrementCount && bonusPerIncrement && maxCount) {
      const formattedBonus = currencyFormatter(bonusPerIncrement, {
        trailingZeroDisplay: "stripIfInteger",
      });

      texts.push(
        `For each additional ${incrementCount} ${metric} on your ${socialPlatform.label}, earn ${formattedBonus}, up to ${maxCount} ${metric}`,
      );
    }
  }

  return texts;
}

interface BountyInfoInput {
  submissionRequirements: Prisma.JsonValue;
  rewardAmount?: number | undefined | null;
}

export function getBountyInfo(bounty: BountyInfoInput | undefined | null) {
  if (!bounty) {
    return null;
  }

  // Social metrics requirements
  const submissionRequirements = bounty.submissionRequirements as {
    socialMetrics?: unknown | Prisma.JsonValue | undefined | null;
  };

  const parsedSocialMetrics = bountySocialContentRequirementsSchema
    .optional()
    .safeParse(submissionRequirements?.socialMetrics);

  const socialMetrics = parsedSocialMetrics.success
    ? parsedSocialMetrics.data
    : null;

  // Identify the social platform
  const socialPlatform = BOUNTY_SOCIAL_PLATFORMS.find(
    ({ value }) => value === socialMetrics?.platform,
  );

  return {
    ...bounty,
    socialPlatform,
    socialMetrics,
    hasSocialMetrics: socialMetrics != null,
  };
}

export interface SocialMetricsRewardTier {
  threshold: number;
  rewardAmount: number;
  status: "met" | "unmet";
}

export function getSocialMetricsRewardTiers({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: Pick<BountySubmissionProps, "socialMetricCount">;
}): SocialMetricsRewardTier[] {
  const bountyInfo = getBountyInfo(bounty);
  const socialMetrics = bountyInfo?.socialMetrics;
  const rewardAmount = bounty?.rewardAmount ?? 0;
  const socialMetricCount = submission.socialMetricCount ?? 0;

  if (!socialMetrics?.metric || !socialMetrics.minCount || rewardAmount <= 0) {
    return [];
  }

  const { minCount, incrementalBonus } = socialMetrics;

  // Base tier
  const tiers: SocialMetricsRewardTier[] = [
    {
      threshold: minCount,
      rewardAmount,
      status: socialMetricCount >= minCount ? "met" : "unmet",
    },
  ];

  if (tiers[0].status === "unmet") {
    return tiers;
  }

  // Incremental bonus tiers
  if (incrementalBonus) {
    const { incrementCount, bonusPerIncrement, maxCount } = incrementalBonus;

    const hasValidIncrementalBonus =
      incrementCount != null &&
      bonusPerIncrement != null &&
      maxCount != null &&
      incrementCount > 0;

    if (hasValidIncrementalBonus) {
      for (
        let t = minCount + incrementCount;
        t <= maxCount;
        t += incrementCount
      ) {
        const status = socialMetricCount >= t ? "met" : "unmet";

        tiers.push({
          threshold: t,
          rewardAmount: bonusPerIncrement,
          status,
        });

        // Stop after first unmet
        if (status === "unmet") {
          break;
        }
      }
    }
  }

  return tiers;
}

export function calculateSocialMetricsRewardAmount({
  bounty,
  submission,
}: {
  bounty: BountyInfoInput | undefined | null;
  submission: Pick<BountySubmissionProps, "socialMetricCount">;
}) {
  const tiers = getSocialMetricsRewardTiers({ bounty, submission });

  if (tiers.length === 0 || submission.socialMetricCount == null) {
    return null;
  }

  return tiers
    .filter((tier) => tier.status === "met")
    .reduce((sum, tier) => sum + tier.rewardAmount, 0);
}

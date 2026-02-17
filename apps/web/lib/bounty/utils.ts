import { currencyFormatter } from "@dub/utils";
import { PartnerBountyProps } from "../types";
import { SOCIAL_METRICS_CHANNELS } from "./constants";

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

export function getSubmissionRequirementTexts(
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

export function getRewardCriteriaTexts(bounty: PartnerBountyProps): string[] {
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

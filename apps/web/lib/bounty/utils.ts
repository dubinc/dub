import { currencyFormatter } from "@dub/utils";
import { PartnerBountyProps } from "../types";
import { SOCIAL_METRICS_CHANNELS } from "./constants";

function getChannel(channelValue?: string) {
  if (!channelValue) {
    return null;
  }

  return SOCIAL_METRICS_CHANNELS.find(({ value }) => value === channelValue);
}

export function getSubmissionRequirementTexts(
  bounty: PartnerBountyProps,
): string[] {
  const socialMetrics = bounty.submissionRequirements?.socialMetrics;

  if (!socialMetrics) {
    return [];
  }

  const channel = getChannel(socialMetrics.channel);

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

  const channel = getChannel(socialMetrics.channel);

  if (!channel || !bounty.rewardAmount) {
    return [];
  }

  const formattedAmount = currencyFormatter(bounty.rewardAmount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  const texts: string[] = [
    `Earn ${formattedAmount} when your ${channel.postType} reaches ${socialMetrics.amount} ${socialMetrics.metric}`,
  ];

  const variableBonus = socialMetrics.variableBonus;

  if (variableBonus) {
    const { incrementalAmount, bonusAmount, capAmount } = variableBonus;

    if (incrementalAmount && bonusAmount && capAmount) {
      const formattedBonus = currencyFormatter(bonusAmount, {
        trailingZeroDisplay: "stripIfInteger",
      });

      texts.push(
        `For every additional ${incrementalAmount} ${socialMetrics.metric}, earn ${formattedBonus} — up to ${capAmount} ${socialMetrics.metric}`,
      );
    }
  }

  return texts;
}

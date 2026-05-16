import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import {
  PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS,
  PARTNER_REFERRAL_PERCENTAGE_TRIGGERS,
  PartnerReferralPercentageTrigger,
} from "@/lib/partner-referrals/constants";
import { RewardProps } from "@/lib/types";
import { referralRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { currencyFormatter } from "@dub/utils";

export function formatRewardDescription(
  reward: RewardProps,
  { includeEarnPrefix = true }: { includeEarnPrefix?: boolean } = {},
) {
  if (reward.description) {
    return reward.description;
  }

  if (reward.event === "referral") {
    return formatReferralRewardDescription(reward, { includeEarnPrefix });
  }

  const rewardAmount = constructRewardAmount(reward);

  const parts: string[] = [];

  if (includeEarnPrefix) {
    parts.push("Earn");
  }
  parts.push(rewardAmount);

  if (reward.event === "sale" && reward.maxDuration === 0) {
    parts.push("for the first sale");
  } else {
    parts.push(`per ${reward.event}`);
  }

  if (reward.maxDuration === null) {
    parts.push("for the customer's lifetime");
  } else if (reward.maxDuration && reward.maxDuration > 1) {
    const durationText =
      reward.maxDuration % 12 === 0
        ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
        : `${reward.maxDuration} months`;
    parts.push(`for ${durationText}`);
  }

  return parts.join(" ");
}

function formatReferralRewardDescription(
  reward: RewardProps,
  { includeEarnPrefix }: { includeEarnPrefix: boolean },
) {
  const rewardAmount = constructRewardAmount(reward);
  const parsed = referralRewardConfigSchema.safeParse(reward.config);
  const config = parsed.success ? parsed.data : undefined;

  if (!config) {
    const duration = formatReferralDuration(reward.maxDuration);
    return [
      includeEarnPrefix ? "Earn" : null,
      rewardAmount,
      "per",
      "referral",
      duration,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (
    reward.type === "percentage" &&
    (PARTNER_REFERRAL_PERCENTAGE_TRIGGERS as readonly string[]).includes(
      config.trigger,
    )
  ) {
    const basis =
      PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS[
        config.trigger as PartnerReferralPercentageTrigger
      ];
    const duration = formatReferralDuration(reward.maxDuration);
    return [
      includeEarnPrefix ? "Earn" : null,
      rewardAmount,
      "per",
      basis,
      duration,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (
    reward.type === "flat" &&
    config.trigger === "commissionThreshold" &&
    config.commissionsThresholdInCents != null
  ) {
    const threshold = currencyFormatter(config.commissionsThresholdInCents, {
      trailingZeroDisplay: "stripIfInteger",
    });

    return `${includeEarnPrefix ? "Earn " : ""}${rewardAmount} when the referred partner earns at least ${threshold} in commissions`;
  }

  if (reward.type === "flat" && config.trigger === "partnerApproved") {
    return `${includeEarnPrefix ? "Earn " : ""}${rewardAmount} when the referred partner is approved into the program`;
  }

  const duration = formatReferralDuration(reward.maxDuration);
  return [
    includeEarnPrefix ? "Earn" : null,
    rewardAmount,
    "per",
    "referral",
    duration,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatReferralDuration(maxDuration: number | null | undefined) {
  if (maxDuration === null) {
    return "for the customer's lifetime";
  }

  if (maxDuration === 0) {
    return "one time";
  }

  if (maxDuration && maxDuration > 1) {
    if (maxDuration % 12 === 0) {
      const years = maxDuration / 12;
      return `for ${years} year${years > 1 ? "s" : ""}`;
    }

    return `for ${maxDuration} months`;
  }

  return "";
}

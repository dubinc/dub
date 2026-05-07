import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";
import {
  PARTNER_REFERRAL_TRIGGER_LABELS,
  referralRewardConfigSchema,
} from "@/lib/zod/schemas/partner-referrals";
import { currencyFormatter } from "@dub/utils";

export function formatRewardDescription(reward: RewardProps) {
  if (reward.description) {
    return reward.description;
  }

  if (reward.event === "referral") {
    return formatReferralRewardDescription(reward);
  }

  const rewardAmount = constructRewardAmount(reward);

  const parts: string[] = [];

  parts.push("Earn");
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

function formatReferralRewardDescription(reward: RewardProps) {
  const rewardAmount = constructRewardAmount(reward);

  const config = referralRewardConfigSchema.safeParse(reward.config).data;

  const triggerLabel = config
    ? PARTNER_REFERRAL_TRIGGER_LABELS[config.trigger]
    : "is";

  if (
    config?.trigger === "commissionThreshold" &&
    config.commissionsThresholdInCents != null
  ) {
    const threshold = currencyFormatter(config.commissionsThresholdInCents, {
      trailingZeroDisplay: "stripIfInteger",
    });

    return `Earn ${rewardAmount} when the referred partner ${triggerLabel} ${threshold} in commissions`;
  }

  return `Earn ${rewardAmount} when the referred partner ${triggerLabel}`;
}

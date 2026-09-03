import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";
import {
  CUSTOM_REWARD_CADENCE_PRESETS,
  customRewardConfigSchema,
} from "@/lib/zod/schemas/rewards";
import { cn } from "@dub/utils";

type CustomRewardDescriptionInput = Pick<
  RewardProps,
  "type" | "amountInCents" | "amountInPercentage" | "maxDuration" | "config"
>;

export function getCustomRewardDescriptionParts(
  reward: CustomRewardDescriptionInput,
) {
  const amount = constructRewardAmount(reward);
  const parsed = customRewardConfigSchema.safeParse(reward.config);
  const config = parsed.success ? parsed.data : undefined;

  const preset = config
    ? CUSTOM_REWARD_CADENCE_PRESETS.find(
        (p) =>
          p.frequency === config.frequency && p.interval === config.interval,
      )
    : undefined;

  const cadenceLabel = preset?.label.toLowerCase() ?? "on a schedule";

  const durationLabel =
    reward.maxDuration == null
      ? null
      : reward.maxDuration % 12 === 0
        ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
        : `${reward.maxDuration} month${reward.maxDuration > 1 ? "s" : ""}`;

  return {
    amount,
    cadenceLabel,
    durationLabel,
  };
}

export function formatCustomRewardDescription(
  reward: CustomRewardDescriptionInput,
  { includeEarnPrefix = true }: { includeEarnPrefix?: boolean } = {},
) {
  const { amount, cadenceLabel, durationLabel } =
    getCustomRewardDescriptionParts(reward);

  return [
    includeEarnPrefix ? "Earn" : null,
    amount,
    cadenceLabel,
    durationLabel ? `for ${durationLabel}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function CustomRewardDescription({
  reward,
  amountClassName,
  periodClassName,
  includeEarnPrefix = true,
}: {
  reward: CustomRewardDescriptionInput;
  amountClassName?: string;
  periodClassName?: string;
  includeEarnPrefix?: boolean;
}) {
  const { amount, cadenceLabel, durationLabel } =
    getCustomRewardDescriptionParts(reward);

  return (
    <>
      {includeEarnPrefix ? <>Earn </> : null}
      <strong className={cn("font-semibold lowercase", amountClassName)}>
        {amount}
      </strong>{" "}
      {cadenceLabel}
      {durationLabel ? (
        <>
          {" "}
          for{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            {durationLabel}
          </strong>
        </>
      ) : null}
    </>
  );
}

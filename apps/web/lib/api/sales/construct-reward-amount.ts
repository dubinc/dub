import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { RewardProps } from "@/lib/types";
import { rewardConditionsArraySchema } from "@/lib/zod/schemas/rewards";
import { currencyFormatter } from "@dub/utils";

export const constructRewardAmount = (
  reward: Pick<
    RewardProps,
    | "type"
    | "amountInCents"
    | "amountInPercentage"
    | "maxDuration"
    | "modifiers"
  >,
) => {
  // If there are modifiers, we need to check if they match the primary reward
  if (reward.modifiers) {
    const parsedModifiers = rewardConditionsArraySchema.safeParse(
      reward.modifiers,
    );

    if (parsedModifiers.success) {
      const modifiers = parsedModifiers.data;

      // if no type or maxDuration, it falls back to the primary reward type and maxDuration
      const matchPrimary = modifiers.every((m) => {
        const typeMatches =
          m.type === undefined ? true : m.type === reward.type;
        const durationMatches =
          m.maxDuration === undefined
            ? true
            : m.maxDuration === reward.maxDuration;
        return typeMatches && durationMatches;
      });

      // If the type AND maxDuration matches the primary, show a range
      if (matchPrimary) {
        const amount = getRewardAmount(reward);

        const min = Math.min(
          amount,
          ...modifiers.map((modifier) =>
            reward.type === "flat"
              ? modifier.amountInCents ?? Infinity
              : modifier.amountInPercentage ?? Infinity,
          ),
        );

        const max = Math.max(
          amount,
          ...modifiers.map((modifier) =>
            reward.type === "flat"
              ? modifier.amountInCents ?? 0
              : modifier.amountInPercentage ?? 0,
          ),
        );

        if (min !== max) {
          return `Up to ${
            reward.type === "percentage"
              ? `${max}%`
              : currencyFormatter(max / 100, {
                  trailingZeroDisplay: "stripIfInteger",
                })
          }`;
        }
      }
    }
  }

  // Return the primary reward amount if
  // 1. There are no modifiers OR
  // 2. type AND timelines doesn't match the primary reward
  return reward.type === "percentage"
    ? `${reward.amountInPercentage}%`
    : currencyFormatter((reward.amountInCents ?? 0) / 100, {
        trailingZeroDisplay: "stripIfInteger",
      });
};

import { RewardProps } from "@/lib/types";
import { rewardConditionsArraySchema } from "@/lib/zod/schemas/rewards";
import { currencyFormatter } from "@dub/utils";

export const constructRewardAmount = (
  reward: Pick<RewardProps, "amount" | "type" | "maxDuration" | "modifiers">,
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
        const min = Math.min(
          reward.amount,
          ...modifiers.map((modifier) => modifier.amount),
        );

        const max = Math.max(
          reward.amount,
          ...modifiers.map((modifier) => modifier.amount),
        );

        if (min !== max) {
          return `Up to ${
            reward.type === "percentage" ? `${max}%` : formatCurrency(max / 100)
          }`;
        }
      }
    }
  }

  // Return the primary reward amount if
  // 1. There are no modifiers OR
  // 2. type AND timelines doesn't match the primary reward
  return reward.type === "percentage"
    ? `${reward.amount}%`
    : formatCurrency(reward.amount / 100);
};

const formatCurrency = (amount: number) =>
  currencyFormatter(
    amount,
    Number.isInteger(amount)
      ? undefined
      : {
          minimumFractionDigits: 2,
        },
  );

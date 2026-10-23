import { evaluateRewardConditions } from "@/lib/partners/evaluate-reward-conditions";
import { rewardConditionsArraySchema } from "@/lib/zod/schemas/rewards";
import { Reward } from "@prisma/client";

// Resolve the click reward amount for a given reward and country
export function resolveClickReward({
  reward,
  country,
}: {
  reward: Reward;
  country: string;
}) {
  let partnerReward = reward;

  if (reward.modifiers) {
    const modifiers = rewardConditionsArraySchema.safeParse(reward.modifiers);

    if (modifiers.success) {
      const matchedCondition = evaluateRewardConditions({
        conditions: modifiers.data,
        context: {
          customer: {
            country,
            source: "tracked",
          },
        },
      });

      if (matchedCondition) {
        partnerReward = {
          ...partnerReward,
          amountInCents:
            matchedCondition.amountInCents != null
              ? matchedCondition.amountInCents
              : null,
        };
      }
    }
  }

  return partnerReward;
}

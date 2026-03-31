import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { evaluateRewardConditions } from "@/lib/partners/evaluate-reward-conditions";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { rewardConditionsArraySchema } from "@/lib/zod/schemas/rewards";
import { Reward } from "@dub/prisma/client";

// Resolve the click reward amount for a given reward and country
export function resolveClickRewardAmount({
  reward,
  country,
}: {
  reward: Reward;
  country: string;
}): number {
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

  return getRewardAmount(serializeReward(partnerReward));
}

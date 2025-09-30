import { EventType, Link, Reward } from "@dub/prisma/client";
import { RewardContext } from "../types";
import {
  rewardConditionsArraySchema,
  RewardSchema,
} from "../zod/schemas/rewards";
import { aggregatePartnerLinksStats } from "./aggregate-partner-links-stats";
import { evaluateRewardConditions } from "./evaluate-reward-conditions";

const REWARD_EVENT_COLUMN_MAPPING = {
  [EventType.click]: "clickReward",
  [EventType.lead]: "leadReward",
  [EventType.sale]: "saleReward",
};

interface ProgramEnrollmentWithReward {
  totalCommissions: number;
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
  links?: Link[] | null;
}

export const determinePartnerReward = ({
  event,
  programEnrollment,
  context,
}: {
  event: EventType;
  programEnrollment: ProgramEnrollmentWithReward;
  context?: RewardContext; // additional reward context (e.g. customer.country, sale.productId, etc.)
}) => {
  let partnerReward: Reward =
    programEnrollment[REWARD_EVENT_COLUMN_MAPPING[event]];

  if (!partnerReward) {
    return null;
  }

  // Add the links metrics to the context
  const partnerLinksStats = aggregatePartnerLinksStats(programEnrollment.links);

  context = {
    ...context,
    partner: {
      ...context?.partner,
      ...partnerLinksStats,
      totalCommissions: programEnrollment.totalCommissions,
    },
  };

  if (partnerReward.modifiers && context) {
    const modifiers = rewardConditionsArraySchema.safeParse(
      partnerReward.modifiers,
    );

    // Parse the conditions before evaluating them
    if (modifiers.success) {
      const matchedCondition = evaluateRewardConditions({
        conditions: modifiers.data,
        context,
      });

      if (matchedCondition) {
        partnerReward = {
          ...partnerReward,
          // Override the reward amount, type and max duration with the matched condition
          amount: matchedCondition.amount,
          type: matchedCondition.type || partnerReward.type,
          maxDuration:
            matchedCondition.maxDuration !== undefined
              ? matchedCondition.maxDuration
              : partnerReward.maxDuration,
        };
      }
    }
  }

  if (partnerReward.amount === 0) {
    return null;
  }

  return RewardSchema.parse(partnerReward);
};

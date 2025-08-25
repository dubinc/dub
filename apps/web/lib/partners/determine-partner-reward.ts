import { EventType, Link, ProgramEnrollment, Reward } from "@dub/prisma/client";
import { RewardContext } from "../types";
import {
  rewardConditionsArraySchema,
  RewardSchema,
} from "../zod/schemas/rewards";
import { evaluateRewardConditions } from "./evaluate-reward-conditions";

const REWARD_EVENT_COLUMN_MAPPING = {
  [EventType.click]: "clickReward",
  [EventType.lead]: "leadReward",
  [EventType.sale]: "saleReward",
};

interface ProgramEnrollmentWithReward extends ProgramEnrollment {
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
  links?:
    | Pick<Link, "clicks" | "leads" | "conversions" | "saleAmount">[]
    | null;
}

export const determinePartnerReward = async ({
  event,
  context,
  programEnrollment,
}: {
  event: EventType;
  context?: RewardContext;
  programEnrollment: ProgramEnrollmentWithReward;
}) => {
  let partnerReward: Reward =
    programEnrollment[REWARD_EVENT_COLUMN_MAPPING[event]];

  if (!partnerReward) {
    return null;
  }

  // Aggregate the links metrics
  const partnerLinksStats = programEnrollment.links?.reduce(
    (acc, link) => {
      acc.totalClicks += link.clicks;
      acc.totalLeads += link.leads;
      acc.totalConversions += link.conversions;
      acc.totalSaleAmount += link.saleAmount;
      return acc;
    },
    {
      totalClicks: 0,
      totalLeads: 0,
      totalConversions: 0,
      totalSaleAmount: 0,
    },
  );

  // Add the links metrics to the context
  context = {
    ...context,
    partner: {
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

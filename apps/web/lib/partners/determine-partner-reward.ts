import { prisma } from "@dub/prisma";
import { EventType, ProgramEnrollment, Reward } from "@dub/prisma/client";
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

export const determinePartnerReward = async ({
  event,
  partnerId,
  programId,
  context,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
  context?: RewardContext;
}) => {
  const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[event];

  const partnerEnrollment = (await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      [rewardIdColumn]: true,
    },
  })) as (ProgramEnrollment & { [key: string]: Reward | null }) | null;

  if (!partnerEnrollment) {
    return null;
  }

  let partnerReward = partnerEnrollment[rewardIdColumn];

  if (!partnerReward) {
    return null;
  }

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

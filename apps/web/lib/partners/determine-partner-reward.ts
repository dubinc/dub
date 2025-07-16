import { prisma } from "@dub/prisma";
import { EventType, ProgramEnrollment, Reward } from "@dub/prisma/client";
import { RewardContext } from "../types";
import { rewardConditionsSchema } from "../zod/schemas/reward-conditions";
import { RewardSchema } from "../zod/schemas/rewards";
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

  const partnerReward = partnerEnrollment[rewardIdColumn];

  if (!partnerReward) {
    return null;
  }

  // evaluate reward rules (if any)
  if (partnerReward.modifiers && context) {
    const conditions = rewardConditionsSchema.parse(partnerReward.modifiers);

    const conditionsMet = evaluateRewardConditions({
      conditions,
      context,
    });

    if (conditionsMet) {
      partnerReward.amount = conditions.amount;
    }
  }

  if (partnerReward.amount === 0) {
    return null;
  }

  return RewardSchema.parse(partnerReward);
};

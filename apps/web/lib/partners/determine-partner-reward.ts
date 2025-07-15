import { prisma } from "@dub/prisma";
import { EventType, ProgramEnrollment, Reward } from "@dub/prisma/client";
import { z } from "zod";
import { rewardContextSchema, RewardSchema } from "../zod/schemas/rewards";
import { evaluateRewardModifier } from "./evaluate-reward-modifier";

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
  context?: z.infer<typeof rewardContextSchema>;
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

  if (partnerReward.modifiers && context) {
    const rewardAmount = evaluateRewardModifier({
      modifier: partnerReward.modifiers,
      context,
    });

    if (rewardAmount) {
      partnerReward.amount = rewardAmount;
    }
  }

  if (partnerReward.amount === 0) {
    return null;
  }

  return RewardSchema.parse(partnerReward);
};

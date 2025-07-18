import { prisma } from "@dub/prisma";
import { EventType, ProgramEnrollment, Reward } from "@dub/prisma/client";
import { RewardSchema } from "../zod/schemas/rewards";
import {
  RewardContext,
  evaluateRewardConditions,
  rewardConditionsArraySchema,
} from "./evaluate-reward-conditions";

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

  if (partnerReward.modifiers && context) {
    const modifiers = rewardConditionsArraySchema.safeParse(
      partnerReward.modifiers,
    );

    // Parse the conditions before evaluating them
    if (modifiers.success) {
      const matchingCondition = evaluateRewardConditions({
        conditions: modifiers.data,
        context,
      });

      if (matchingCondition) {
        partnerReward.amount = matchingCondition.amount;

        console.log("Matching condition found", {
          matchingCondition: JSON.stringify(matchingCondition, null, 2),
          context: JSON.stringify(context, null, 2),
        });
      }
    }
  }

  if (partnerReward.amount === 0) {
    return null;
  }

  return RewardSchema.parse(partnerReward);
};

import { prisma } from "@dub/prisma";
import { EventType, ProgramEnrollment, Reward } from "@dub/prisma/client";
import { RewardSchema } from "../zod/schemas/rewards";

const REWARD_EVENT_COLUMN_MAPPING = {
  [EventType.click]: "clickReward",
  [EventType.lead]: "leadReward",
  [EventType.sale]: "saleReward",
};

export const determinePartnerReward = async ({
  event,
  partnerId,
  programId,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
}) => {
  const rewardType = REWARD_EVENT_COLUMN_MAPPING[event];

  const partnerEnrollment = (await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      [rewardType]: true,
    },
  })) as (ProgramEnrollment & { [key: string]: Reward | null }) | null;

  if (!partnerEnrollment) {
    return null;
  }

  const partnerReward = partnerEnrollment[rewardType];

  console.log("Found partner reward", partnerReward);

  if (!partnerReward || partnerReward.amount === 0) {
    return null;
  }

  return RewardSchema.parse(partnerReward);
};

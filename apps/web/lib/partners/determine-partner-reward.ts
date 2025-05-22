import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { RewardSchema } from "../zod/schemas/rewards";

const PartnerRewardSchema = RewardSchema.omit({ geoRules: true });

export const determinePartnerReward = async ({
  event,
  partnerId,
  programId,
  country,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
  country?: string | null;
}) => {
  const rewards = await prisma.reward.findMany({
    where: {
      programId,
      event,
      OR: [
        // program-wide
        {
          partners: {
            none: {},
          },
        },
        // partner-specific
        {
          partners: {
            some: {
              programEnrollment: {
                programId,
                partnerId,
              },
            },
          },
        },
      ],
    },
    include: {
      _count: {
        select: {
          partners: true,
        },
      },
    },
  });

  if (rewards.length === 0) {
    return null;
  }

  const partnerSpecificReward = rewards.find(
    (reward) => reward._count.partners > 0,
  );

  const programWideReward = rewards.find(
    (reward) => reward._count.partners === 0,
  );

  let reward = partnerSpecificReward || programWideReward;

  if (!reward) {
    return null;
  }

  if (
    event === "lead" &&
    country &&
    reward.geoRules &&
    reward.geoRules[country]
  ) {
    const amount = reward.geoRules[country];

    if (amount === 0) {
      return null;
    }

    reward = {
      ...reward,
      amount,
    };
  }

  if (reward.amount === 0) {
    return null;
  }

  return PartnerRewardSchema.parse(reward);
};

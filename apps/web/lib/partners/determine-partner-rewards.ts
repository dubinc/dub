import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { RewardSchema } from "../zod/schemas/rewards";

// TODO: Combine with determinePartnerReward
export const determinePartnerRewards = async ({
  partnerId,
  programId,
  event,
}: {
  partnerId: string;
  programId: string;
  event?: EventType;
}) => {
  const rewards = await prisma.reward.findMany({
    where: {
      programId,
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
      ...(event && {
        event,
      }),
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

  const partnerSpecificRewards = rewards.filter(
    (reward) => reward._count.partners > 0,
  );

  const programWideReward = rewards.find(
    (reward) => reward._count.partners === 0,
  );

  const partnerRewards = [...partnerSpecificRewards, programWideReward];

  if (partnerRewards.length === 0) {
    return null;
  }

  return partnerRewards.map((reward) => RewardSchema.parse(reward));
};

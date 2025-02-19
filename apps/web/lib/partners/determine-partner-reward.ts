import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { RewardSchema } from "../zod/schemas/rewards";

export const determinePartnerReward = async ({
  event,
  partnerId,
  programId,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
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

  const partnerReward = partnerSpecificReward || programWideReward;

  if (!partnerReward || partnerReward.amount === 0) {
    return null;
  }

  return RewardSchema.parse(partnerReward);
};

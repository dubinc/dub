import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { EventType } from "@dub/prisma/client";
import { prismaEdge } from "@dub/prisma/edge";

export const determinePartnerReward = async ({
  event,
  partnerId,
  programId,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
}) => {
  const rewards = await prismaEdge.reward.findMany({
    where: {
      event,
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
                partnerId,
                programId,
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

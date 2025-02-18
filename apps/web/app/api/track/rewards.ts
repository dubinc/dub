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
    select: {
      amount: true,
      type: true,
      _count: {
        select: {
          partners: true,
        },
      },
    },
  });

  if (rewards.length === 0) {
    return;
  }

  const partnerSpecificReward = rewards.find(
    (reward) => reward._count.partners > 0,
  );

  const programWideReward = rewards.find(
    (reward) => reward._count.partners === 0,
  );

  return partnerSpecificReward || programWideReward || null;
};

import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";

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

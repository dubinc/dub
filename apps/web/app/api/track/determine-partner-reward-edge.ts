import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { EventType } from "@dub/prisma/client";
import { prismaEdge } from "@dub/prisma/edge";

// this is a duplicate of the function in /lib/partners/determine-partner-reward.ts
// TODO: ideally this should just be a single function in the future
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

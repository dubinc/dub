import { prisma } from "@dub/prisma";
import { EventType, Reward } from "@dub/prisma/client";
import { subMonths } from "date-fns";
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

  const reward = partnerSpecificReward || programWideReward;

  if (!reward || reward.amount === 0) {
    return null;
  }

  const hasReachedLimit = await hasPartnerReachedLimit({
    event,
    partnerId,
    programId,
    reward,
  });

  if (hasReachedLimit) {
    console.log(
      `Partner ${partnerId} has reached the limit for reward ${reward.id} on the program ${programId}.`,
    );

    return null;
  }

  return RewardSchema.parse(reward);
};

// Check if the partner has reached the limit for the reward in the last payoutResetInterval
export const hasPartnerReachedLimit = async ({
  event,
  partnerId,
  programId,
  reward,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
  reward: Pick<Reward, "maxTotalPayout" | "payoutResetInterval">;
}) => {
  if (!reward.maxTotalPayout || !reward.payoutResetInterval) {
    return false;
  }

  const endDate = new Date();
  const startDate = subMonths(endDate, reward.payoutResetInterval);

  const result = await prisma.commission.aggregate({
    where: {
      earnings: {
        gt: 0,
      },
      programId,
      partnerId,
      status: {
        in: ["pending", "processed", "paid"],
      },
      type: event, // TODO: We might need to cover this in index?
      createdAt: {
        gt: startDate,
        lt: endDate,
      },
    },
    _sum: {
      earnings: true,
    },
  });

  const totalEarnings = result._sum.earnings || 0;
  const hasReachedLimit = totalEarnings >= reward.maxTotalPayout;

  console.log({
    startDate,
    endDate,
    totalEarnings,
    hasReachedLimit,
    maxTotalPayout: reward.maxTotalPayout,
  });

  return hasReachedLimit;
};

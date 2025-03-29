import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";

// TODO:
// Need a better name for this function

export const validatePartnerRewardAmount = async ({
  event,
  partnerId,
  programId,
  earnings,
  maxRewardAmount,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
  earnings: number;
  maxRewardAmount: number | null;
}) => {
  if (!maxRewardAmount) {
    return {
      allowedEarnings: earnings,
    };
  }

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
      type: event,
    },
    _sum: {
      earnings: true,
    },
  });

  const totalEarnings = result._sum.earnings || 0;

  if (totalEarnings >= maxRewardAmount) {
    return {
      allowedEarnings: 0,
    };
  }

  if (totalEarnings + earnings <= maxRewardAmount) {
    return {
      allowedEarnings: earnings,
    };
  }

  const remainingAllowance = maxRewardAmount - totalEarnings;
  const allowedEarnings = Math.max(0, Math.min(earnings, remainingAllowance));

  return {
    allowedEarnings,
  };
};

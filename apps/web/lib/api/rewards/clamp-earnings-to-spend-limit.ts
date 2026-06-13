import { RewardProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { SpendLimitInterval } from "@dub/prisma/client";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function getSpendLimitWindow(spendLimitInterval: SpendLimitInterval) {
  const date = new Date();

  if (spendLimitInterval === "day") {
    return {
      startDate: startOfDay(date),
      endDate: endOfDay(date),
    };
  }

  if (spendLimitInterval === "week") {
    return {
      startDate: startOfWeek(date),
      endDate: endOfWeek(date),
    };
  }

  if (spendLimitInterval === "month") {
    return {
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
    };
  }

  return {
    startDate: null,
    endDate: null,
  };
}

export async function getCappedEarnings({
  reward,
  earnings,
  partnerId,
  customerId,
}: {
  reward: Pick<
    RewardProps,
    "event" | "spendLimitAmount" | "spendLimitInterval"
  >;
  earnings: number;
  partnerId: string;
  customerId: string;
}) {
  if (
    earnings === 0 ||
    reward.spendLimitAmount == null ||
    reward.spendLimitInterval == null ||
    reward.event === "referral"
  ) {
    return earnings;
  }

  const { startDate, endDate } = getSpendLimitWindow(reward.spendLimitInterval);

  // Find the commission earnings for the partner and customer for the spend limit window
  const {
    _sum: { earnings: totalEarnings },
  } = await prisma.commission.aggregate({
    where: {
      partnerId,
      customerId,
      type: reward.event,
      status: {
        in: ["pending", "processed", "paid"],
      },
      createdAt: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    },
    _sum: {
      earnings: true,
    },
  });

  return Math.max(
    0,
    Math.min(earnings, reward.spendLimitAmount - (totalEarnings ?? 0)),
  );
}

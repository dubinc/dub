import { RewardProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { ProgramEnrollment, SpendLimitInterval } from "@dub/prisma/client";
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
  programEnrollment,
  reward,
  earnings,
}: {
  programEnrollment: Pick<ProgramEnrollment, "programId" | "partnerId">;
  reward: Pick<
    RewardProps,
    "event" | "spendLimitAmount" | "spendLimitInterval"
  >;
  earnings: number;
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

  const {
    _sum: { earnings: totalEarnings },
  } = await prisma.commission.aggregate({
    where: {
      programId: programEnrollment.programId,
      partnerId: programEnrollment.partnerId,
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

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

export function getSpendLimitWindow({
  interval,
}: {
  interval: SpendLimitInterval;
}) {
  const date = new Date();

  if (interval === "day") {
    return {
      startDate: startOfDay(date),
      endDate: endOfDay(date),
    };
  }

  if (interval === "week") {
    return {
      startDate: startOfWeek(date),
      endDate: endOfWeek(date),
    };
  }

  if (interval === "month") {
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
    reward.spendLimitInterval == null
  ) {
    return earnings;
  }

  const { startDate, endDate } = getSpendLimitWindow({
    interval: reward.spendLimitInterval,
  });

  const {
    _sum: { earnings: totalEarnings },
  } = await prisma.commission.aggregate({
    where: {
      programId: programEnrollment.programId,
      partnerId: programEnrollment.partnerId,
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

import { RewardProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { RewardSpendLimitInterval } from "@dub/prisma/client";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function getSpendLimitWindow(
  spendLimitInterval: RewardSpendLimitInterval,
) {
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

// Reward cap scope:
// - Sales: partner and customer level
// - Clicks & Leads: partner level only
type SpendLimitDbClient = Pick<typeof prisma, "commission">;

export async function getCappedEarnings({
  reward,
  earnings,
  partnerId,
  customerId,
  tx = prisma,
}: {
  reward: Pick<
    RewardProps,
    "event" | "spendLimitAmount" | "spendLimitInterval"
  >;
  earnings: number;
  partnerId: string;
  customerId: string;
  tx?: SpendLimitDbClient;
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

  // Find the commission earnings for the partner and customer (if applicable) for the spend limit window
  const {
    _sum: { earnings: totalEarnings },
  } = await tx.commission.aggregate({
    where: {
      partnerId,
      ...(reward.event === "sale" ? { customerId } : {}),
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

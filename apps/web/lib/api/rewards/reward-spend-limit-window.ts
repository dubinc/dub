import { RewardSpendLimitInterval } from "@prisma/client";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function getRewardSpendLimitWindow({
  spendLimitInterval,
  referenceDate,
}: {
  spendLimitInterval: RewardSpendLimitInterval;
  referenceDate: Date; // when calculating historical earnings, this is the start date of the aggregation
}) {
  const date = referenceDate;

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

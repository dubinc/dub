import { getDaysDifference } from "@dub/utils";

export type DateRangeValidationResult =
  | { valid: true }
  | {
      valid: false;
      code: "free-limit" | "pro-limit";
      message: string;
    };

export const validDateRangeForPlan = ({
  plan,
  dataAvailableFrom,
  interval,
  start,
  end,
}: {
  plan?: string | null;
  dataAvailableFrom?: Date;
  interval?: string;
  start?: Date | null;
  end?: Date | null;
}): DateRangeValidationResult => {
  const now = new Date(Date.now());
  if (interval === "all" && dataAvailableFrom && !start) {
    start = dataAvailableFrom;
  }

  // Free plan users can only get analytics for 30 days
  if (
    (!plan || plan === "free") &&
    (interval === "90d" ||
      interval === "1y" ||
      interval === "ytd" ||
      (start && getDaysDifference(start, end || now) > 31))
  ) {
    return {
      valid: false,
      code: "free-limit",
      message:
        "You can only get analytics for up to 30 days on a Free plan. Upgrade to Pro or Business to get analytics for longer periods.",
    };
  }

  // Pro plan users can only get analytics for 1 year
  if (plan === "pro" && start && getDaysDifference(start, end || now) > 366) {
    return {
      valid: false,
      code: "pro-limit",
      message:
        "You can only get analytics for up to 1 year on a Pro plan. Upgrade to Business to get analytics for longer periods.",
    };
  }

  return {
    valid: true,
  };
};

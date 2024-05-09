import { getDaysDifference } from "@dub/utils";
import { DubApiError } from "../api/errors";

export const validDateRangeForPlan = ({
  plan,
  interval,
  start,
  end,
  throwError,
}: {
  plan?: string | null;
  interval?: string;
  start?: Date | null;
  end?: Date | null;
  throwError?: boolean;
}) => {
  // Free plan users can only get analytics for 30 days
  if (
    (!plan || plan === "free") &&
    (interval === "all" ||
      interval === "90d" ||
      interval === "1y" ||
      interval === "ytd" ||
      (start &&
        end &&
        (getDaysDifference(start, new Date(Date.now())) > 30 ||
          getDaysDifference(start, end) > 30)))
  ) {
    if (throwError) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only get analytics for up to 30 days on a Free plan. Upgrade to Pro or Business to get analytics for longer periods.",
      });
    } else {
      return false;
    }
  }

  // Pro plan users can only get analytics for 1 year
  if (
    plan === "pro" &&
    (interval === "all" ||
      (start &&
        end &&
        (getDaysDifference(start, new Date(Date.now())) > 365 ||
          getDaysDifference(start, end) > 365)))
  ) {
    if (throwError) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only get analytics for up to 1 year on a Pro plan. Upgrade to Business to get analytics for longer periods.",
      });
    } else {
      return false;
    }
  }

  return true;
};

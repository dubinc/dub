import { getDaysDifference } from "@dub/utils";

export const validDateRangeForPlan = ({
  plan,
  interval,
  start,
  end,
}: {
  plan?: string | null;
  interval?: string;
  start?: Date | null;
  end?: Date | null;
}) => {
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
    return false;
  }

  if (
    plan === "pro" &&
    (interval === "all" ||
      (start &&
        end &&
        (getDaysDifference(start, new Date(Date.now())) > 365 ||
          getDaysDifference(start, end) > 365)))
  ) {
    return false;
  }

  return true;
};

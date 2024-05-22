import { getDaysDifference } from "@dub/utils";
import { DubApiError } from "../api/errors";

export const formatAnalyticsEndpoint = (
  endpoint: string,
  type: "plural" | "singular",
) => {
  const plural = {
    country: "countries",
    city: "cities",
    device: "devices",
    browser: "browsers",
    referer: "referers",
  };

  const singular = {
    countries: "country",
    cities: "city",
    devices: "device",
    browsers: "browser",
    referers: "referer",
  };

  if (type === "plural") {
    return plural[endpoint] || endpoint;
  } else if (type === "singular") {
    return singular[endpoint] || endpoint;
  }
};

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
        (getDaysDifference(start, new Date(Date.now())) > 31 ||
          getDaysDifference(start, end || new Date(Date.now())) > 31)))
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
        (getDaysDifference(start, new Date(Date.now())) > 366 ||
          getDaysDifference(start, end || new Date(Date.now())) > 366)))
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

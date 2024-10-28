import { getDaysDifference } from "@dub/utils";
import { json2csv } from "json-2-csv";
import { DubApiError } from "../api/errors";

export const editQueryString = (
  queryString: string,
  data: Record<string, string>,
  del?: string | string[],
) => {
  const searchParams = new URLSearchParams(queryString);

  for (const key in data) {
    searchParams.set(key, data[key]);
  }

  if (del)
    (Array.isArray(del) ? del : [del]).forEach((d) => searchParams.delete(d));

  return searchParams.toString();
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

export const convertToCSV = (data: object[]) => {
  return json2csv(data, {
    parseValue(fieldValue, defaultParser) {
      if (fieldValue instanceof Date) {
        return fieldValue.toISOString();
      }
      return defaultParser(fieldValue);
    },
  });
};

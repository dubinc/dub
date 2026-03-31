import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { DubApiError } from "../../api/errors";

export const assertValidDateRangeForPlan = (params: {
  plan?: string | null;
  dataAvailableFrom?: Date;
  interval?: string;
  start?: Date | null;
  end?: Date | null;
}) => {
  const result = validDateRangeForPlan(params);

  if (!result.valid) {
    throw new DubApiError({
      code: "forbidden",
      message: result.message,
    });
  }

  return true;
};

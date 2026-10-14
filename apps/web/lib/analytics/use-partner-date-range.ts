import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { IntervalOptions } from "@/lib/analytics/types";
import { useRouterStuff } from "@dub/ui";
import { endOfDay, startOfDay } from "date-fns";
import { useMemo } from "react";

// the date range from the URL, as the partner earnings and analytics hooks need it
export function usePartnerDateRange() {
  const { searchParamsObj } = useRouterStuff();

  const {
    start,
    end,
    interval = DUB_PARTNERS_ANALYTICS_INTERVAL,
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  return useMemo(
    () => ({
      start: start ? startOfDay(new Date(start)) : undefined,
      end: end ? endOfDay(new Date(end)) : undefined,
      interval,
    }),
    [start, end, interval],
  );
}

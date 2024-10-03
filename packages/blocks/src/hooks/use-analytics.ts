import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { useDub } from "../context";
import { EventType } from "../types";

interface UseAnalyticsParams {
  event: EventType;
  interval: string;
  groupBy: "timeseries" | "top_links" | "devices" | "count";
}

export const useAnalytics = ({
  event,
  interval,
  groupBy,
}: UseAnalyticsParams) => {
  const { publicToken } = useDub();

  const searchParams = new URLSearchParams({
    event,
    interval,
    groupBy,
    publicToken,
  });

  const { error, data, isLoading } = useSWR(
    `/api/analytics/client?${searchParams.toString()}`,
    fetcher,
  );

  return {
    analytics: data,
    error,
    isLoading,
  };
};

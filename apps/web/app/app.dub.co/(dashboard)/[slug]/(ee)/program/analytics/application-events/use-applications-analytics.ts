import {
  applicationEventAnalyticsSchema,
} from "@/lib/application-events/schema";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";

type ApplicationAnalyticsByGroup = {
  [K in keyof typeof applicationEventAnalyticsSchema]: z.infer<
    (typeof applicationEventAnalyticsSchema)[K]
  >;
};

export function useApplicationsAnalyticsCount(
  {
    queryString,
    enabled = true,
  }: {
    queryString?: string;
    enabled?: boolean;
  },
) {
  const url =
    enabled && queryString
      ? `/api/applications/analytics?groupBy=count&${queryString}`
      : null;

  const { data, error, isLoading } = useSWR<
    ApplicationAnalyticsByGroup["count"]
  >(url, fetcher, {
    keepPreviousData: true,
  });

  return {
    data,
    error,
    isLoading,
  };
}

export function useApplicationsAnalyticsGrouped<
  TGroupBy extends keyof ApplicationAnalyticsByGroup,
>({
  groupBy,
  queryString,
  enabled = true,
}: {
  groupBy: TGroupBy;
  queryString?: string;
  enabled?: boolean;
}) {
  const url = enabled
    ? `/api/applications/analytics?groupBy=${groupBy}${
        queryString ? `&${queryString}` : ""
      }`
    : null;

  const { data, error, isLoading } = useSWR<
    ApplicationAnalyticsByGroup[TGroupBy][]
  >(url, fetcher, {
    keepPreviousData: true,
  });

  return {
    data,
    error,
    isLoading,
  };
}

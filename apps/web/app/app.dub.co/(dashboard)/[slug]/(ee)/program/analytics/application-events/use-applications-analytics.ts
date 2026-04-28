import { applicationEventAnalyticsSchema } from "@/lib/application-events/schema";
import useWorkspace from "@/lib/swr/use-workspace";
import { ApplicationEventAnalyticsQuery } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";

type ApplicationAnalyticsByGroup = {
  [K in keyof typeof applicationEventAnalyticsSchema]: z.infer<
    (typeof applicationEventAnalyticsSchema)[K]
  >;
};

export function useApplicationsAnalytics<
  TGroupBy extends keyof ApplicationAnalyticsByGroup,
>(filters: ApplicationEventAnalyticsQuery & { groupBy: TGroupBy }) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = getQueryString(
    {
      ...filters,
      workspaceId,
    },
    {
      exclude: [
        "pageTab",
        "applicationEvent",
        "view",
        "sortBy",
        "sortOrder",
        "page",
        "pageSize",
      ],
    },
  );

  const { data, error, isLoading } = useSWR<
    ApplicationAnalyticsByGroup[TGroupBy][]
  >(workspaceId ? `/api/applications/analytics${queryString}` : null, fetcher, {
    keepPreviousData: true,
  });

  return {
    data,
    error,
    isLoading,
  };
}

// TODO:
// Cleanup this

export function useApplicationsAnalyticsCount({
  queryString,
  enabled = true,
}: {
  queryString?: string;
  enabled?: boolean;
}) {
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

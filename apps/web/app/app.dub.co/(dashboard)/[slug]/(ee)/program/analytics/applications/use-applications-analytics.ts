import useWorkspace from "@/lib/swr/use-workspace";
import {
  ApplicationAnalyticsByGroup,
  ApplicationEventAnalyticsQuery,
} from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

type ApplicationAnalyticsFilterKey = Extract<
  keyof ApplicationEventAnalyticsQuery,
  "partnerId" | "referralSource" | "country"
>;

interface UseApplicationsAnalyticsProps<
  TGroupBy extends keyof ApplicationAnalyticsByGroup,
> extends ApplicationEventAnalyticsQuery {
  groupBy: TGroupBy;
  exclude?: ApplicationAnalyticsFilterKey[];
}

export function useApplicationsAnalytics<
  TGroupBy extends keyof ApplicationAnalyticsByGroup,
>({ exclude, ...filters }: UseApplicationsAnalyticsProps<TGroupBy>) {
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
        ...(exclude ?? []),
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

export function useApplicationsAnalyticsCount(
  filters: Omit<ApplicationEventAnalyticsQuery, "groupBy"> = {},
) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = getQueryString(
    {
      ...filters,
      groupBy: "count",
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
    ApplicationAnalyticsByGroup["count"]
  >(workspaceId ? `/api/applications/analytics${queryString}` : null, fetcher, {
    keepPreviousData: true,
  });

  return {
    data,
    error,
    isLoading,
  };
}

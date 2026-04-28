import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { ApplicationEvent, ApplicationEventsQuery } from "../types";
import useWorkspace from "./use-workspace";

export function useApplicationEvents(filters: ApplicationEventsQuery) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = getQueryString(
    {
      ...filters,
      workspaceId,
    },
    {
      exclude: ["pageTab", "applicationEvent", "view"],
    },
  );

  const { data, error, isLoading } = useSWR<ApplicationEvent[]>(
    workspaceId ? `/api/applications/events${queryString}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    isLoading,
  };
}

import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { FraudEventProps } from "../types";
import useWorkspace from "./use-workspace";

export function useFraudEvents() {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const queryString = getQueryString({
    workspaceId,
  });

  const { data, isLoading, error } = useSWR<FraudEventProps[]>(
    defaultProgramId ? `/api/fraud-events${queryString}` : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEvents: data,
    loading: isLoading,
    error,
  };
}

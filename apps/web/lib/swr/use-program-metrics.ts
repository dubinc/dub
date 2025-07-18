import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { ProgramMetrics } from "../types";
import useWorkspace from "./use-workspace";

export default function useProgramMetrics() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<ProgramMetrics>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/metrics${getQueryString({
        workspaceId,
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    metrics: data,
    loading: !data && !error,
    error,
  };
}

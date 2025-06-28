import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { ProgramProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useProgram<T = ProgramProps>(
  {
    query,
  }: {
    query?: Record<string, any>;
  } = {},
  options?: SWRConfiguration,
) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const {
    data: program,
    error,
    mutate,
  } = useSWR<T>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}?${new URLSearchParams({ workspaceId, ...query }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
      ...options,
    },
  );

  return {
    program,
    error,
    mutate,
    loading: !program && !error ? true : false,
  };
}

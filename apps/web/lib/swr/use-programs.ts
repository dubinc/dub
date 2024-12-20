import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { ProgramProps } from "../types";
import useWorkspace from "./use-workspace";

export default function usePrograms() {
  const { id: workspaceId, partnersEnabled } = useWorkspace();

  const { data: programs, error } = useSWR<ProgramProps[]>(
    partnersEnabled && `/api/programs?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    programs,
    error,
    loading: !programs && !error ? true : false,
  };
}

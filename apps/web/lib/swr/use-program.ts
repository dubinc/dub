import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useProgram<T = ProgramProps>({
  query,
}: {
  query?: Record<string, any>;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams();

  const {
    data: program,
    error,
    mutate,
  } = useSWR<T>(
    programId &&
      workspaceId &&
      `/api/programs/${programId}?${new URLSearchParams({ workspaceId, ...query }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    program,
    error,
    mutate,
    loading: programId && !program && !error ? true : false,
  };
}

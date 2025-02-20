import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProgramProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useProgram() {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams();

  const {
    data: program,
    error,
    mutate,
  } = useSWR<ProgramProps>(
    programId &&
      workspaceId &&
      `/api/programs/${programId}?workspaceId=${workspaceId}`,
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

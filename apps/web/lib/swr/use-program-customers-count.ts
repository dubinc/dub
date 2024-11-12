import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useProgramCustomersCount() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: customersCount, error } = useSWR<number>(
    `/api/programs/${programId}/customers/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  return {
    customersCount,
    error,
  };
}

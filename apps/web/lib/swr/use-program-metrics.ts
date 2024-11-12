import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useProgramMetrics() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<{
    revenue: number;
    payouts: number;
    salesCount: number;
    partnersCount: number;
  }>(`/api/programs/${programId}/metrics?workspaceId=${workspaceId}`, fetcher);

  return {
    metrics: data,
    loading: !data && !error,
    error,
  };
}

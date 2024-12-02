import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useProgramMetrics() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<{
    revenue: number;
    payouts: number;
    salesCount: number;
    partnersCount: number;
  }>(
    `/api/programs/${programId}/metrics${getQueryString({
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

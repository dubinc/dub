import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { SalesCount } from "../types";
import useWorkspace from "./use-workspace";

export default function useSalesCount(opts?: Record<string, any>) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace() as { id: string };
  const { getQueryString } = useRouterStuff();

  const { data: salesCount, error } = useSWR<SalesCount>(
    `/api/programs/${programId}/sales/count${getQueryString(
      {
        workspaceId,
      },
      {
        ...opts,
        exclude: ["view", ...(opts?.exclude || [])],
      },
    )}`,
    fetcher,
  );

  return {
    salesCount,
    error,
  };
}

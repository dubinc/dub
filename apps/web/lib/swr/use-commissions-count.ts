import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { CommissionsCount } from "../types";
import useWorkspace from "./use-workspace";

export default function useCommissionsCount(opts?: Record<string, any>) {
  const { id: workspaceId } = useWorkspace() as { id: string };
  const { getQueryString } = useRouterStuff();

  const { data: commissionsCount, error } = useSWR<CommissionsCount>(
    `/api/commissions/count${getQueryString(
      {
        workspaceId,
      },
      {
        ...opts,
        exclude: opts?.exclude || [],
      },
    )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    commissionsCount,
    error,
  };
}

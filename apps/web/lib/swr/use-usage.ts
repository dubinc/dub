import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { UsageResponse } from "../types";
import useWorkspace from "./use-workspace";

export default function useUsage({
  resource,
}: {
  resource: "links" | "events" | "revenue";
}) {
  const { id } = useWorkspace();

  const {
    data: usage,
    error,
    isValidating,
  } = useSWR<UsageResponse[]>(
    id && `/api/workspaces/${id}/billing/usage?resource=${resource}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    usage,
    loading: !usage && !error,
    isValidating,
  };
}

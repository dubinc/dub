import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useDefaultDomains({
  search,
}: { search?: string } = {}) {
  const { id, flags } = useWorkspace();

  const { data, error, mutate } = useSWR<string[]>(
    id &&
      `/api/domains/default?${new URLSearchParams({
        workspaceId: id,
        ...(search && { search }),
      }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const defaultDomains = useMemo(() => {
    return flags && !flags.callink
      ? data?.filter((d) => d !== "cal.link")
      : data;
  }, [data, flags]);

  return {
    defaultDomains,
    loading: !data && !error,
    mutate,
    error,
  };
}

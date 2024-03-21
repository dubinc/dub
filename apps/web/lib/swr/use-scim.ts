import type { Directory } from "@boxyhq/saml-jackson";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useSCIM() {
  const { id } = useWorkspace();

  const { data, isLoading, mutate } = useSWR<{ directories: Directory[] }>(
    id && `/api/workspaces/${id}/scim`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const configured = useMemo(() => {
    return data?.directories && data.directories.length > 0;
  }, [data]);

  return {
    scim: data as { directories: Directory[] },
    provider: configured ? data!.directories[0].type : null,
    configured,
    loading: isLoading,
    mutate,
  };
}

import type { SAMLSSORecord } from "@boxyhq/saml-jackson";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useSAML() {
  const { id } = useWorkspace();

  const { data, isLoading, mutate } = useSWR<{ connections: SAMLSSORecord[] }>(
    id && `/api/workspaces/${id}/saml`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const configured = useMemo(() => {
    return data?.connections && data.connections.length > 0;
  }, [data]);

  return {
    saml: data as { connections: SAMLSSORecord[] },
    provider: configured
      ? data!.connections[0].idpMetadata.friendlyProviderName
      : null,
    configured,
    loading: isLoading,
    mutate,
  };
}

import { useRouter } from "next/router";
import useSWR from "swr";
import type { SAMLSSORecord } from "@boxyhq/saml-jackson";
import { fetcher } from "#/lib/utils";
import { useMemo } from "react";

export default function useSAML() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { data, isLoading, mutate } = useSWR<{ connections: SAMLSSORecord[] }>(
    slug && `/api/projects/${slug}/saml`,
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
    loading: !slug || isLoading,
    mutate,
  };
}

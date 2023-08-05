import { useRouter } from "next/router";
import useSWR from "swr";
import type { SAMLSSORecord } from "@boxyhq/saml-jackson";
import { fetcher } from "#/lib/utils";

export default function useSAML() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const {
    data: saml,
    isLoading,
    mutate,
  } = useSWR<{ connections: SAMLSSORecord[] }>(
    slug && `/api/projects/${slug}/saml`,
    fetcher,
  );

  return {
    saml,
    isLoading,
    mutate,
  };
}

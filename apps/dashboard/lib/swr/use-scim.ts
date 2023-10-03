import { useRouter } from "next/router";
import useSWR from "swr";
import type { Directory } from "@boxyhq/saml-jackson";
import { fetcher } from "#/lib/utils";
import { useMemo } from "react";

export default function useSCIM() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { data, isLoading, mutate } = useSWR<{ directories: Directory[] }>(
    slug && `/api/projects/${slug}/scim`,
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
    loading: !slug || isLoading,
    mutate,
  };
}

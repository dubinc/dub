import { useRouter } from "next/router";
import { useMemo } from "react";
import useSWR from "swr";
import { DomainProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function useDomains(domain?: string) {
  const router = useRouter();

  let { slug } = router.query as {
    slug: string;
  };

  if (!slug) {
    slug = "dub";
  }

  const { data: domains, error } = useSWR<DomainProps[]>(
    slug && `/api/projects/${slug}/domains`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  return {
    domains,
    primaryDomain: useMemo(
      () => domains?.find((domain) => domain.primary)?.slug,
      [domains],
    ),
    verified: domain
      ? domains?.find((d) => d.slug === domain)?.verified
      : domains?.find((d) => d.primary)?.verified,
    loading: !domains && !error,
    error,
  };
}

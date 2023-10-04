import { useRouter } from "next/router";
import { useMemo } from "react";
import useSWR from "swr";
import { DomainProps } from "#/lib/types";
import { fetcher } from "#/lib/utils";

export default function useDomains({ domain }: { domain?: string } = {}) {
  const router = useRouter();

  let { slug } = router.query as {
    slug: string;
  };

  const { data, error } = useSWR<DomainProps[]>(
    slug && `/api/projects/${slug}/domains`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const domains = useMemo(() => {
    if (router.isReady) {
      return slug
        ? data
        : ([
            {
              slug: "dub.sh",
              verified: true,
              primary: true,
              target: "https://dub.co",
              type: "redirect",
            },
          ] as DomainProps[]);
    }
  }, [data, router.isReady]);

  return {
    domains,
    primaryDomain:
      domains?.find((domain) => domain.primary)?.slug ||
      (domains && domains.length > 0 && domains[0].slug),
    verified: domain
      ? // If a domain is passed, check if it's verified
        domains?.find((d) => d.slug === domain)?.verified
      : // If no domain is passed, check if any of the domains are verified
        domains?.some((d) => d.verified),
    loading: !domains && !error,
    error,
  };
}

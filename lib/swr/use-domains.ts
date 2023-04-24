import { useRouter } from "next/router";
import { useMemo } from "react";
import useSWR from "swr";
import { DomainProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function useDomains({
  domain,
  includeLinkCount,
}: { domain?: string; includeLinkCount?: boolean } = {}) {
  const router = useRouter();

  let { slug } = router.query as {
    slug: string;
  };

  if (!slug && router.isReady) {
    slug = "dub";
  }

  const { data: domains, error } = useSWR<DomainProps[]>(
    slug &&
      `/api/projects/${slug}/domains${
        includeLinkCount ? "?includeLinkCount=true" : ""
      }`,
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
      ? // If a domain is passed, check if it's verified
        domains?.find((d) => d.slug === domain)?.verified
      : // If no domain is passed, check if any of the domains are verified
        domains?.some((d) => d.verified),
    loading: !domains && !error,
    error,
  };
}

import { DomainProps } from "@/lib/types";
import { DUB_DOMAINS, fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";

export default function useDomains({ domain }: { domain?: string } = {}) {
  const { slug } = useParams() as {
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
    return slug ? data : DUB_DOMAINS;
  }, [slug, data]) as DomainProps[];

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

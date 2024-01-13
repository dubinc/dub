import { DomainProps } from "@/lib/types";
import { DUB_DOMAINS, fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useProject from "./use-project";

export default function useDomains({ domain }: { domain?: string } = {}) {
  const { slug } = useParams() as {
    slug: string;
  };

  const {
    data: projectDomains,
    error,
    mutate,
  } = useSWR<DomainProps[]>(slug && `/api/projects/${slug}/domains`, fetcher, {
    dedupingInterval: 60000,
  });

  const { defaultDomains: projectDefaultDomains } = useProject();

  const defaultDomains =
    (projectDefaultDomains &&
      DUB_DOMAINS.filter((d) => projectDefaultDomains?.includes(d.slug))) ||
    DUB_DOMAINS;

  const allDomains = [...(projectDomains || []), ...defaultDomains];

  return {
    domains: projectDomains,
    defaultDomains,
    allDomains,
    primaryDomain:
      projectDomains?.find((domain) => domain.primary)?.slug ||
      defaultDomains.find((domain) => domain.primary)?.slug,
    verified: domain
      ? // If a domain is passed, check if it's verified
        allDomains.find((d) => d.slug === domain)?.verified
      : // If no domain is passed, check if any of the domains are verified
        allDomains.some((d) => d.verified),
    loading: !projectDomains && !error,
    mutate,
    error,
  };
}

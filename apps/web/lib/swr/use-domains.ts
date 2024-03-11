import { DomainProps } from "@/lib/types";
import { DUB_DOMAINS, SHORT_DOMAIN, fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useDefaultDomains from "./use-default-domains";

export default function useDomains({ domain }: { domain?: string } = {}) {
  const { slug } = useParams() as {
    slug: string;
  };

  const { data, error, mutate } = useSWR<DomainProps[]>(
    slug && `/api/domains?projectSlug=${slug}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );
  const { defaultDomains: projectDefaultDomains } = useDefaultDomains();

  const allProjectDomains = data || [];
  const activeProjectDomains = data?.filter((domain) => !domain.archived);
  const archivedProjectDomains = data?.filter((domain) => domain.archived);

  const activeDefaultDomains =
    (projectDefaultDomains &&
      DUB_DOMAINS.filter((d) => projectDefaultDomains?.includes(d.slug))) ||
    DUB_DOMAINS;

  const allDomains = [
    ...allProjectDomains,
    ...(slug === "dub" ? [] : DUB_DOMAINS),
  ];
  const allActiveDomains = [
    ...(activeProjectDomains || []),
    ...(slug === "dub" ? [] : activeDefaultDomains),
  ];

  const primaryDomain =
    activeProjectDomains?.find((domain) => domain.primary)?.slug ||
    activeDefaultDomains.find((domain) => domain.primary)?.slug ||
    SHORT_DOMAIN;

  const verified = domain
    ? // If a domain is passed, check if it's verified
      allDomains.find((d) => d.slug === domain)?.verified
    : // If no domain is passed, check if any of the project domains are verified
      activeProjectDomains?.some((d) => d.verified);

  return {
    activeProjectDomains, // active project domains
    archivedProjectDomains, // archived project domains
    activeDefaultDomains, // active default Dub domains
    allProjectDomains, // all project domains (active + archived)
    allActiveDomains, // all active domains (active project domains + active default Dub domains)
    allDomains, // all domains (all project domains + all default Dub domains)
    primaryDomain,
    verified,
    loading: !data && !error,
    mutate,
    error,
  };
}

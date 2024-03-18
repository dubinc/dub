import { DomainProps } from "@/lib/types";
import {
  DUB_DOMAINS,
  DUB_WORKSPACE_ID,
  SHORT_DOMAIN,
  fetcher,
} from "@dub/utils";
import useSWR from "swr";
import useDefaultDomains from "./use-default-domains";
import useWorkspace from "./use-workspace";

export default function useDomains({
  id: workspaceId,
  domain,
}: { id?: string; domain?: string } = {}) {
  let id: string | undefined = undefined;
  if (workspaceId) {
    id = workspaceId;
  } else {
    const { id: paramsId } = useWorkspace();
    id = paramsId;
  }

  const { data, error, mutate } = useSWR<DomainProps[]>(
    id && `/api/domains?workspaceId=${id}`,
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
    ...(id === `ws_${DUB_WORKSPACE_ID}` ? [] : DUB_DOMAINS),
  ];
  const allActiveDomains = [
    ...(activeProjectDomains || []),
    ...(id === `ws_${DUB_WORKSPACE_ID}` ? [] : activeDefaultDomains),
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

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
  archived,
  search,
}: { id?: string; domain?: string; archived?: boolean; search?: string } = {}) {
  let id: string | undefined = undefined;
  if (workspaceId) {
    id = workspaceId;
  } else {
    const { id: paramsId } = useWorkspace();
    id = paramsId;
  }

  const { data, error, mutate } = useSWR<DomainProps[]>(
    id &&
      `/api/domains?` +
        new URLSearchParams({
          workspaceId: id,
          ...(archived !== undefined && { archived: archived.toString() }),
          ...(search !== undefined && { search }),
        }).toString(),
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );
  const { defaultDomains: workspaceDefaultDomains } = useDefaultDomains();

  const allWorkspaceDomains = data || [];
  const activeWorkspaceDomains = data?.filter((domain) => !domain.archived);

  const activeDefaultDomains =
    (workspaceDefaultDomains &&
      DUB_DOMAINS.filter((d) => workspaceDefaultDomains?.includes(d.slug))) ||
    DUB_DOMAINS;

  const allDomains = [
    ...allWorkspaceDomains,
    ...(id === `ws_${DUB_WORKSPACE_ID}` ? [] : DUB_DOMAINS),
  ];
  const allActiveDomains = [
    ...(activeWorkspaceDomains || []),
    ...(id === `ws_${DUB_WORKSPACE_ID}` ? [] : activeDefaultDomains),
  ];

  const primaryDomain =
    activeWorkspaceDomains && activeWorkspaceDomains.length > 0
      ? activeWorkspaceDomains.find((domain) => domain.primary)?.slug ||
        activeWorkspaceDomains[0].slug
      : SHORT_DOMAIN;

  const verified = domain
    ? // If a domain is passed, check if it's verified
      allDomains.find((d) => d.slug === domain)?.verified
    : // If no domain is passed, check if any of the workspace domains are verified
      activeWorkspaceDomains?.some((d) => d.verified);

  return {
    activeWorkspaceDomains, // active workspace domains
    activeDefaultDomains, // active default Dub domains
    allWorkspaceDomains, // all workspace domains (active + archived)
    allActiveDomains, // all active domains (active workspace domains + active default Dub domains)
    allDomains, // all domains (all workspace domains + all default Dub domains)
    primaryDomain,
    verified,
    loading: !data && !error,
    mutate,
    error,
  };
}

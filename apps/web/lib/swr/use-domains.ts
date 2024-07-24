import { DomainProps } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import {
  DUB_DOMAINS,
  DUB_WORKSPACE_ID,
  PREMIUM_SHORT_DOMAIN,
  SHORT_DOMAIN,
  fetcher,
} from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useDefaultDomains from "./use-default-domains";
import useWorkspace from "./use-workspace";

export default function useDomains({
  includeParams,
}: {
  includeParams?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error, mutate } = useSWR<DomainProps[]>(
    workspaceId &&
      `/api/domains${
        includeParams
          ? getQueryString({
              workspaceId,
            })
          : `?workspaceId=${workspaceId}`
      }`,
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
    ...(workspaceId === `ws_${DUB_WORKSPACE_ID}` ? [] : DUB_DOMAINS),
  ];
  const allActiveDomains = [
    ...(activeWorkspaceDomains || []),
    ...(workspaceId === `ws_${DUB_WORKSPACE_ID}` ? [] : activeDefaultDomains),
  ];

  const primaryDomain = useMemo(() => {
    if (activeWorkspaceDomains && activeWorkspaceDomains.length > 0) {
      return (
        activeWorkspaceDomains.find(({ primary }) => primary)?.slug ||
        activeWorkspaceDomains[0].slug
      );
    } else if (
      activeDefaultDomains.find(({ slug }) => slug === PREMIUM_SHORT_DOMAIN)
    ) {
      return PREMIUM_SHORT_DOMAIN;
    }
    return SHORT_DOMAIN;
  }, [activeDefaultDomains, activeWorkspaceDomains]);

  return {
    activeWorkspaceDomains, // active workspace domains
    activeDefaultDomains, // active default Dub domains
    allWorkspaceDomains, // all workspace domains (active + archived)
    allActiveDomains, // all active domains (active workspace domains + active default Dub domains)
    allDomains, // all domains (all workspace domains + all default Dub domains)
    primaryDomain,
    loading: !data && !error,
    mutate,
    error,
  };
}

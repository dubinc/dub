import { DomainProps } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import {
  DUB_DOMAINS,
  DUB_WORKSPACE_ID,
  SHORT_DOMAIN,
  fetcher,
} from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import { prefixWorkspaceId } from "../api/workspace-id";
import useDefaultDomains from "./use-default-domains";
import useWorkspace from "./use-workspace";

export default function useDomains({
  ignoreParams,
  opts,
}: {
  ignoreParams?: boolean;
  opts?: Record<string, string>;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error, mutate } = useSWR<DomainProps[]>(
    workspaceId &&
      `/api/domains${
        ignoreParams
          ? "?" +
            new URLSearchParams({
              ...opts,
              workspaceId,
            }).toString()
          : getQueryString({
              ...opts,
              workspaceId,
            })
      }`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );
  const {
    defaultDomains: workspaceDefaultDomains,
    loading: loadingDefaultDomains,
  } = useDefaultDomains(opts);

  const allWorkspaceDomains = useMemo(() => data || [], [data]);
  const activeWorkspaceDomains = useMemo(
    () => data?.filter((domain) => !domain.archived),
    [data],
  );

  const activeDefaultDomains = useMemo(
    () =>
      (workspaceDefaultDomains &&
        DUB_DOMAINS.filter((d) => workspaceDefaultDomains?.includes(d.slug))) ||
      DUB_DOMAINS,
    [workspaceDefaultDomains],
  );

  const allDomains = useMemo(
    () => [
      ...allWorkspaceDomains,
      ...(workspaceId === prefixWorkspaceId(DUB_WORKSPACE_ID)
        ? []
        : DUB_DOMAINS),
    ],
    [allWorkspaceDomains, workspaceId],
  );
  const allActiveDomains = useMemo(
    () => [
      ...(activeWorkspaceDomains || []),
      ...(workspaceId === prefixWorkspaceId(DUB_WORKSPACE_ID)
        ? []
        : activeDefaultDomains),
    ],
    [activeWorkspaceDomains, activeDefaultDomains, workspaceId],
  );

  const primaryDomain = useMemo(() => {
    if (activeWorkspaceDomains && activeWorkspaceDomains.length > 0) {
      return (
        activeWorkspaceDomains.find(({ primary }) => primary)?.slug ||
        activeWorkspaceDomains[0].slug
      );
    } else if (activeDefaultDomains.find(({ slug }) => slug === "dub.link")) {
      return "dub.link";
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
    loading: (!data && !error) || loadingDefaultDomains,
    mutate,
    error,
  };
}

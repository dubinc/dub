import { ExtendedWorkspaceProps } from "@/lib/types";
import { PRO_PLAN, fetcher, getNextPlan } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import { MEGA_WORKSPACE_LINKS_LIMIT } from "../constants/misc";

export default function useWorkspace({
  swrOpts,
}: {
  swrOpts?: SWRConfiguration;
} = {}) {
  let { slug } = useParams() as { slug: string | null };
  const searchParams = useSearchParams();
  if (!slug) {
    slug = searchParams.get("slug") || searchParams.get("workspace");
  }

  const {
    data: workspace,
    error,
    mutate,
  } = useSWR<ExtendedWorkspaceProps>(
    slug && `/api/workspaces/${slug}`,
    fetcher,
    {
      dedupingInterval: 60000,
      ...swrOpts,
    },
  );

  return {
    ...workspace,
    nextPlan: workspace?.plan ? getNextPlan(workspace.plan) : PRO_PLAN,
    role: (workspace?.users && workspace.users[0].role) || "member",
    isOwner: workspace?.users && workspace.users[0].role === "owner",
    exceededClicks: workspace && workspace.usage >= workspace.usageLimit,
    exceededLinks: workspace && workspace.linksUsage >= workspace.linksLimit,
    exceededPayouts:
      workspace?.payoutsLimit &&
      workspace.payoutsUsage >= workspace.payoutsLimit
        ? true
        : false,
    exceededAI: workspace && workspace.aiUsage >= workspace.aiLimit,
    exceededDomains:
      workspace?.domains && workspace.domains.length >= workspace.domainsLimit,
    isMegaWorkspace:
      workspace && workspace.totalLinks >= MEGA_WORKSPACE_LINKS_LIMIT,
    error,
    defaultFolderId: workspace?.users && workspace.users[0].defaultFolderId,
    mutate,
    loading: slug && !workspace && !error ? true : false,
  };
}

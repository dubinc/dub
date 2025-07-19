import useUser from "@/lib/swr/use-user.ts";
import { ExpandedWorkspaceProps } from "@/lib/types";
import { PRO_PLAN, fetcher, getNextPlan } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";

export default function useWorkspace({
  swrOpts,
}: {
  swrOpts?: SWRConfiguration;
} = {}) {
  let { slug } = useParams() as { slug: string | null };
  const searchParams = useSearchParams();
  const { user } = useUser();

  if (!slug) {
    slug =
      searchParams.get("slug") ||
      searchParams.get("workspace") ||
      (user?.defaultWorkspace as string);
  }

  const {
    data: workspace,
    error,
    mutate,
  } = useSWR<ExpandedWorkspaceProps>(
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
    exceededAI: workspace && workspace.aiUsage >= workspace.aiLimit,
    exceededDomains:
      workspace?.domains && workspace.domains.length >= workspace.domainsLimit,
    error,
    mutate,
    loading: slug && !workspace && !error ? true : false,
  };
}

import { PRO_PLAN, fetcher, getNextPlan } from "@dub/utils";
import useSWR from "swr";
import { WorkspaceProps } from "../../src/types";
import { useSelectedWorkspace } from "../../src/workspace/workspace-now";

export default function useWorkspace() {
  const { selectedWorkspace } = useSelectedWorkspace();
  const {
    data: workspace,
    error,
    mutate,
  } = useSWR<WorkspaceProps>(
    selectedWorkspace && `/api/workspaces/${selectedWorkspace.slug}`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  return {
    ...workspace,
    nextPlan: workspace?.plan ? getNextPlan(workspace.plan) : PRO_PLAN,
    isOwner: workspace?.users && workspace.users[0].role === "owner",
    exceededClicks: workspace && workspace.usage >= workspace.usageLimit,
    exceededLinks: workspace && workspace.linksUsage >= workspace.linksLimit,
    exceededAI: workspace && workspace.aiUsage >= workspace.aiLimit,
    exceededDomains:
      workspace?.domains && workspace.domains.length >= workspace.domainsLimit,
    error,
    mutate,
    loading: selectedWorkspace && !workspace && !error ? true : false,
  };
}

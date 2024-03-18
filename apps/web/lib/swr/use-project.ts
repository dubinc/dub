import { ProjectProps } from "@/lib/types";
import { PRO_PLAN, fetcher, getNextPlan } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import useDefaultDomains from "./use-default-domains";

export default function useProject() {
  let { slug } = useParams() as { slug: string | null };
  const searchParams = useSearchParams();
  if (!slug) {
    slug = searchParams.get("slug");
  }

  const {
    data: workspace,
    error,
    mutate,
  } = useSWR<ProjectProps>(slug && `/api/workspaces/${slug}`, fetcher, {
    dedupingInterval: 30000,
  });

  const { defaultDomains } = useDefaultDomains();

  return {
    ...workspace,
    nextPlan: workspace?.plan ? getNextPlan(workspace.plan) : PRO_PLAN,
    defaultDomains: defaultDomains || [],
    isOwner: workspace?.users && workspace.users[0].role === "owner",
    exceededClicks: workspace && workspace.usage >= workspace.usageLimit,
    exceededLinks: workspace && workspace.linksUsage >= workspace.linksLimit,
    exceededDomains:
      workspace?.domains && workspace.domains.length >= workspace.domainsLimit,
    error,
    mutate,
    loading: slug && !workspace && !error ? true : false,
  };
}

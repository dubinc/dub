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
    data: project,
    error,
    mutate,
  } = useSWR<ProjectProps>(slug && `/api/projects/${slug}`, fetcher, {
    dedupingInterval: 30000,
  });

  const { defaultDomains } = useDefaultDomains();

  return {
    ...project,
    nextPlan: project?.plan ? getNextPlan(project.plan) : PRO_PLAN,
    defaultDomains: defaultDomains || [],
    isOwner: project?.users && project.users[0].role === "owner",
    exceededClicks: project && project.usage >= project.usageLimit,
    exceededLinks: project && project.linksUsage >= project.linksLimit,
    exceededDomains:
      project?.domains && project.domains.length >= project.domainsLimit,
    error,
    mutate,
    loading: slug && !project && !error ? true : false,
  };
}

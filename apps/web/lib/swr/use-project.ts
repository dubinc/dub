import { ProjectProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function useProject() {
  const { slug } = useParams() as { slug?: string };

  const { data: project, error } = useSWR<ProjectProps>(
    slug && `/api/projects/${slug}`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );
  return {
    ...project,
    isOwner: project?.users && project.users[0].role === "owner",
    exceededClicks: project && project.usage >= project.usageLimit,
    exceededLinks: project && project.linksUsage >= project.linksLimit,
    exceededDomains:
      project?.domains && project.domains.length >= project.domainsLimit,
    error,
    loading: slug && !project && !error,
  };
}

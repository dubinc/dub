import { ProjectWithDomainProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export default function useProjects() {
  const { data: projects, error } = useSWR<ProjectWithDomainProps[]>(
    "/api/projects",
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  const userProjects = projects?.map((project) => ({
    ...project,
    isOwner: project?.users && project.users[0].role === "owner",
    primaryDomain:
      project.domains.find((domain) => domain.primary) || project.domains[0],
  }));

  const freeProjects = userProjects?.filter(
    (project) => project.plan === "free" && project.isOwner,
  );

  return {
    projects: userProjects,
    freeProjects,
    exceedingFreeProjects: freeProjects && freeProjects.length > 1,
    error,
    loading: !projects && !error,
  };
}

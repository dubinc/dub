import { ProjectWithDomainProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export default function useProjects() {
  const { data, error } = useSWR<ProjectWithDomainProps[]>(
    "/api/projects",
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  const projects = data?.map((project) => ({
    ...project,
    isOwner: project?.users && project.users[0].role === "owner",
    primaryDomain:
      project.domains.find((domain) => domain.primary) || project.domains[0],
  }));

  const freeProjects = projects?.filter(
    (project) => project.plan === "free" && project.isOwner,
  );

  return {
    projects,
    freeProjects,
    exceedingFreeProjects: freeProjects && freeProjects.length >= 2,
    error,
    loading: !projects && !error,
  };
}

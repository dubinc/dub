import useSWR from "swr";
import { ProjectWithDomainProps } from "#/lib/types";
import { fetcher } from "#/lib/utils";

export default function useProjects() {
  const { data: projects } = useSWR<ProjectWithDomainProps[]>(
    "/api/projects",
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  return {
    projects: projects?.map((project) => ({
      ...project,
      primaryDomain:
        project.domains.find((domain) => domain.primary) || project.domains[0],
    })),
  };
}

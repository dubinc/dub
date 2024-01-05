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

  return {
    projects: projects?.map((project) => ({
      ...project,
      primaryDomain:
        project.domains.find((domain) => domain.primary) || project.domains[0],
    })),
    error,
    loading: !projects && !error,
  };
}

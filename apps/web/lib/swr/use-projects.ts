import { ProjectProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export default function useProjects() {
  const { data: projects, error } = useSWR<ProjectProps[]>(
    "/api/projects",
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  const freeProjects = projects?.filter(
    (project) =>
      project.plan === "free" &&
      project?.users &&
      project.users[0].role === "owner",
  );

  return {
    projects,
    freeProjects,
    exceedingFreeProjects: freeProjects && freeProjects.length >= 2,
    error,
    loading: !projects && !error,
  };
}

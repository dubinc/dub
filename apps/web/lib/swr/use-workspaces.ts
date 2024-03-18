import { ProjectProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export default function useWorkspaces() {
  const { data: workspaces, error } = useSWR<ProjectProps[]>(
    "/api/workspaces",
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  const freeWorkspces = workspaces?.filter(
    (workspace) =>
      workspace.plan === "free" &&
      workspace?.users &&
      workspace.users[0].role === "owner",
  );

  return {
    workspaces,
    freeWorkspces,
    exceedingFreeWorkspces: freeWorkspces && freeWorkspces.length >= 2,
    error,
    loading: !workspaces && !error,
  };
}

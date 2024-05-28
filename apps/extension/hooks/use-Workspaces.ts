import useSWR from "swr";
import { fetcher } from "@dub/utils";
import { WorkspaceProps } from "../src/types";

export default function useWorkspaces() {
  const { data: workspaces, error } = useSWR<WorkspaceProps[]>(
    "/api/workspaces",
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  const freeWorkspaces = workspaces?.filter(
    (workspace) =>
      workspace.plan === "free" &&
      workspace?.users &&
      workspace.users[0].role === "owner",
  );

  return {
    workspaces,
    freeWorkspaces,
    exceedingFreeWorkspaces: freeWorkspaces && freeWorkspaces.length >= 2,
    error,
    loading: !workspaces && !error,
  };
}

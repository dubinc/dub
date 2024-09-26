import { WorkspaceProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";

export default function useWorkspaces() {
  const { data: session } = useSession();
  const { data: workspaces, error } = useSWR<WorkspaceProps[]>(
    session?.user && "/api/workspaces",
    fetcher,
    {
      dedupingInterval: 60000,
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

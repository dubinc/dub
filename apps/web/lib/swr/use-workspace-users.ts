import { WorkspaceUserProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useWorkspaceUsers({
  invites,
}: { invites?: boolean } = {}) {
  const { id, role } = useWorkspace();

  const { data: users, error } = useSWR<WorkspaceUserProps[]>(
    id &&
      role !== "viewer" &&
      (invites
        ? `/api/workspaces/${id}/invites`
        : `/api/workspaces/${id}/users`),
    fetcher,
  );

  return {
    users,
    loading: !error && !users,
  };
}

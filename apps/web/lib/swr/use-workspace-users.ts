import { WorkspaceUserProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

type UserWithTokens = WorkspaceUserProps & {
  restrictedTokens: {
    name: string;
    lastUsed: Date;
  }[];
};

export default function useWorkspaceUsers({
  invites,
}: { invites?: boolean } = {}) {
  const { id } = useWorkspace();

  const { data: users, error } = useSWR<WorkspaceUserProps[]>(
    id &&
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

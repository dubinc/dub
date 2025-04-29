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

export default function useUsers<T extends boolean = false>({
  invites,
}: { invites?: T } = {}) {
  const { id } = useWorkspace();

  const { data: users, error } = useSWR<
    T extends true ? WorkspaceUserProps[] : UserWithTokens[]
  >(
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

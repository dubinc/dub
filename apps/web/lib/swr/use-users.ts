import { UserProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function useUsers({ invites }: { invites?: boolean } = {}) {
  const { slug } = useParams() as {
    slug: string;
  };

  const { data: users, error } = useSWR<UserProps[]>(
    slug &&
      (invites
        ? `/api/projects/${slug}/invites`
        : `/api/projects/${slug}/users`),
    fetcher,
  );

  return {
    users,
    loading: !error && !users,
  };
}

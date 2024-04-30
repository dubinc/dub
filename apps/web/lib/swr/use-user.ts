import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { UserProps } from "../types";

export default function useUser({ userId }: { userId?: string } = {}) {
  const { data, isLoading } = userId
    ? useSWR<UserProps>(`/api/user/${userId}`, fetcher)
    : useSWRImmutable<UserProps>("/api/user", fetcher);

  return {
    user: data,
    loading: isLoading,
  };
}

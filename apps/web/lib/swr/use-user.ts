import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { UserProps } from "../types";

export default function useUser() {
  const { data, isLoading } = useSWRImmutable<UserProps>("/api/user", fetcher);

  return {
    user: data,
    loading: isLoading,
  };
}

export function useUserCache() {
  const { data, isLoading, error } = useSWR<UserProps>("/api/user", fetcher, {
    revalidateOnMount: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    user: data,
    loading: isLoading,
    error,
    isAuthorized: !!data,
  };
}

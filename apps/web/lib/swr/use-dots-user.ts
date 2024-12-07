import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { DotsUser } from "../dots/types";

export default function useDotsUser() {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: dotsUser,
    error,
    isLoading,
    mutate,
  } = useSWR<DotsUser>(
    partnerId ? `/api/partners/${partnerId}/dots-user` : null,
    fetcher,
  );

  return {
    dotsUser,
    error,
    isLoading,
    mutate,
  };
}

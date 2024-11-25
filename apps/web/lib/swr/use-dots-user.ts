import { fetcher } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { DotsUser } from "../dots/types";

export default function useDotsUser() {
  let { partnerId } = useParams();
  const searchParams = useSearchParams();
  if (!partnerId) {
    partnerId = searchParams.get("partner") ?? "";
  }

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

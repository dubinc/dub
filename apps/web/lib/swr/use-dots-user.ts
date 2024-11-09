import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { DotsUser } from "../dots/types";

export default function useDotsUser() {
  const { partnerId } = useParams();

  const {
    data: dotsUser,
    isLoading,
    mutate,
  } = useSWR<DotsUser>(
    partnerId ? `/api/partners/${partnerId}/dots-user` : null,
    fetcher,
  );

  return {
    dotsUser,
    isLoading,
    mutate,
  };
}

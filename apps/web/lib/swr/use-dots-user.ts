import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DotsUser } from "../dots/types";

export default function useDotsUser() {
  const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";

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

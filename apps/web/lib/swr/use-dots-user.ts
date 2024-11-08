import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DotsUser } from "../dots/types";
import usePartnerProfile from "./use-partner-profile";

export default function useDotsUser() {
  const { partner } = usePartnerProfile();

  const { data, error } = useSWR<DotsUser>(
    partner?.dotsUserId ? `/api/partners/${partner.id}/dots-user` : null,
    fetcher,
  );

  return {
    data,
    error,
    loading: !data && !error,
  };
}

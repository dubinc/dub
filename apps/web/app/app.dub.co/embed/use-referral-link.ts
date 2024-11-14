import { fetcher } from "@dub/utils";
import { Link } from "@prisma/client";
import useSWR from "swr";

export const useReferralLink = () => {
  const {
    data: link,
    error,
    isLoading,
  } = useSWR<Link>(`/api/referrals/link`, fetcher);

  return {
    link,
    error,
    isLoading,
  };
};

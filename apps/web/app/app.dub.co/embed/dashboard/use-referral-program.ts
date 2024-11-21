import { fetcher } from "@dub/utils";
import { Program } from "@prisma/client";
import useSWR from "swr";

export const useReferralProgram = () => {
  const {
    data: program,
    error,
    isLoading,
  } = useSWR<Program>(`/api/referrals/program`, fetcher);

  return {
    program,
    error,
    isLoading,
  };
};

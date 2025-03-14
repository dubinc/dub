import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollments({
  includeRewardsDiscounts = false,
}: {
  includeRewardsDiscounts?: boolean;
} = {}) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: programEnrollments, isLoading } = useSWR<
    ProgramEnrollmentProps[]
  >(
    partnerId &&
      `/api/partner-profile/programs${includeRewardsDiscounts ? "?includeRewardsDiscounts=true" : ""}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    programEnrollments,
    isLoading,
  };
}

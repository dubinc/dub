import {
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import { PartnerProfileProgramEnrollmentProps } from "../types";

export default function useProgramEnrollment({
  enabled = true,
  programSlug: programSlugProp,
  swrOpts,
}: {
  enabled?: boolean;
  programSlug?: string;
  swrOpts?: SWRConfiguration;
} = {}) {
  const { data: session, status } = useSession();
  const { programSlug: programSlugParam } = useParams();
  const programSlug = programSlugProp ?? programSlugParam;

  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: programEnrollment,
    error,
    isLoading,
  } = useSWR<PartnerProfileProgramEnrollmentProps>(
    enabled && partnerId && programSlug
      ? `/api/partner-profile/programs/${programSlug}`
      : undefined,
    fetcher,
    {
      dedupingInterval: 60000,
      ...swrOpts,
    },
  );

  return {
    programEnrollment,
    showDetailedAnalytics:
      programEnrollment && getShowDetailedAnalytics(programEnrollment),
    error,
    loading: status === "loading" || isLoading,
  };
}

export function getShowDetailedAnalytics(
  programEnrollment: Pick<
    PartnerProfileProgramEnrollmentProps,
    "programId" | "status" | "totalCommissions"
  >,
) {
  return (
    !LARGE_PROGRAM_IDS.includes(programEnrollment.programId) ||
    (programEnrollment.status === "approved" &&
      programEnrollment.totalCommissions >=
        LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS)
  );
}

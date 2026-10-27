import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as z from "zod/v4";
import { PartnerProfileProgramEnrollmentProps } from "../types";
import { partnerProfileProgramsQuerySchema } from "../zod/schemas/partner-profile";

export default function useProgramEnrollments({
  includeInactiveDates,
  ...query
}: Omit<
  z.input<typeof partnerProfileProgramsQuerySchema>,
  "includeRewardsDiscounts" | "includeInactiveDates"
> & {
  includeRewardsDiscounts?: boolean;
  includeInactiveDates?: boolean;
} = {}) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: programEnrollments,
    isLoading,
    error,
  } = useSWR<PartnerProfileProgramEnrollmentProps[]>(
    partnerId &&
      `/api/partner-profile/programs?${new URLSearchParams(
        Object.fromEntries(
          Object.entries({
            ...query,
            // sent only when true, so other callers share the same request
            includeInactiveDates: includeInactiveDates || undefined,
          })
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        ),
      )}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    programEnrollments,
    isLoading,
    error,
  };
}

import { fetcher } from "@dub/utils";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import useSWR from "swr";

// GET /api/partner-profile/programs/count?groupBy=status
export default function useProgramEnrollmentsStatusCounts() {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data, isLoading, error } = useSWR<
    { status: ProgramEnrollmentStatus; _count: number }[]
  >(
    partnerId && "/api/partner-profile/programs/count?groupBy=status",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const counts = useMemo(
    () =>
      data
        ? (Object.fromEntries(
            data.map(({ status, _count }) => [status, _count]),
          ) as Record<ProgramEnrollmentStatus, number>)
        : undefined,
    [data],
  );

  return {
    counts,
    isLoading,
    error,
  };
}

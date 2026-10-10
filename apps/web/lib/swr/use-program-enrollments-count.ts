import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as z from "zod/v4";
import { partnerProfileProgramsCountQuerySchema } from "../zod/schemas/partner-profile";

export default function useProgramEnrollmentsCount(
  query: Omit<
    z.input<typeof partnerProfileProgramsCountQuerySchema>,
    "groupBy"
  > = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: count,
    isLoading,
    error,
  } = useSWR<number>(
    enabled &&
      partnerId &&
      `/api/partner-profile/programs/count?${new URLSearchParams(
        Object.entries(query).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      )}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    count,
    isLoading,
    error,
  };
}

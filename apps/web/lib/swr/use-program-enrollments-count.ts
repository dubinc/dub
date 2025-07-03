import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { z } from "zod";
import { partnerProfileProgramsCountQuerySchema } from "../zod/schemas/partner-profile";

export default function useProgramEnrollmentsCount(
  query: z.infer<typeof partnerProfileProgramsCountQuerySchema> = {},
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: count, isLoading } = useSWR<number>(
    partnerId &&
      `/api/partner-profile/programs/count?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(query).map(([key, value]) => [key, value.toString()]),
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
  };
}

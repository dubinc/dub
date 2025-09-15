import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { z } from "zod";
import { PartnerProgramEnrollmentProps } from "../types";
import { partnerProfileProgramsQuerySchema } from "../zod/schemas/partner-profile";

export default function useProgramEnrollments(
  query: z.infer<typeof partnerProfileProgramsQuerySchema> = {},
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: programEnrollments, isLoading } = useSWR<
    PartnerProgramEnrollmentProps[]
  >(
    partnerId &&
      `/api/partner-profile/programs?${new URLSearchParams(
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
    programEnrollments,
    isLoading,
  };
}

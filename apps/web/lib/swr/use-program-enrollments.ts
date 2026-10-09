import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as z from "zod/v4";
import { ProgramEnrollmentProps } from "../types";
import { partnerProfileProgramsQuerySchema } from "../zod/schemas/partner-profile";

export default function useProgramEnrollments(
  query: z.input<typeof partnerProfileProgramsQuerySchema> = {},
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: programEnrollments, isLoading } = useSWR<
    ProgramEnrollmentProps[]
  >(
    partnerId &&
      `/api/partner-profile/programs?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(query)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
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

import { useSession } from "@/lib/better-auth/use-session";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { ProgramEnrollmentProps } from "../types";
import { partnerProfileProgramsQuerySchema } from "../zod/schemas/partner-profile";

export default function useProgramEnrollments(
  query: z.infer<typeof partnerProfileProgramsQuerySchema> = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: programEnrollments, isLoading } = useSWR<
    ProgramEnrollmentProps[]
  >(
    enabled &&
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

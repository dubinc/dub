import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import { ProgramEnrollmentProps } from "../types";

export default function useProgramEnrollment({
  enabled = true,
  swrOpts,
}: {
  enabled?: boolean;
  swrOpts?: SWRConfiguration;
} = {}) {
  const { data: session, status } = useSession();
  const { programSlug } = useParams();

  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: programEnrollment,
    error,
    isLoading,
  } = useSWR<ProgramEnrollmentProps>(
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
    error,
    loading: status === "loading" || isLoading,
  };
}

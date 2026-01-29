import { PartnerProfileReferral } from "@/lib/zod/schemas/partner-profile";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function usePartnerReferrals() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<PartnerProfileReferral[]>(
    programSlug &&
      `/api/partner-profile/programs/${programSlug}/referrals${getQueryString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    isLoading,
    error,
  };
}

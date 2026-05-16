import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ReferredPartnerProps } from "../types";

export function useReferredPartners() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<ReferredPartnerProps[]>(
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

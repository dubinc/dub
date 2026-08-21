import { PartnerProfileSubmittedLead } from "@/lib/zod/schemas/partner-profile";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function usePartnerSubmittedLeads() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<PartnerProfileSubmittedLead[]>(
    programSlug &&
      `/api/partner-profile/programs/${programSlug}/submitted-leads${getQueryString()}`,
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

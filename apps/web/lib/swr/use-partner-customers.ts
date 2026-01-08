import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerProfileCustomerProps } from "../types";

export default function usePartnerCustomers() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<
    (PartnerProfileCustomerProps & { name?: string | null })[]
  >(
    programSlug &&
      `/api/partner-profile/programs/${programSlug}/customers${getQueryString()}`,
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

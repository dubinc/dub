import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { PartnerProps } from "../types";

export default function usePartnerProfile() {
  const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";

  const { data: partner, error } = useSWR<PartnerProps>(
    partnerId && `/api/partners/${partnerId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    partner,
    error,
    loading: partnerId && !partner && !error ? true : false,
  };
}

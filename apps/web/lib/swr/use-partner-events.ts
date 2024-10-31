import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerEventsFilters } from "../analytics/types";

export default function usePartnerEvents(params?: PartnerEventsFilters) {
  const { partnerId, programId } = useParams();

  const { data, error } = useSWR<any>(
    `/api/partners/${partnerId}/programs/${programId}/events?${new URLSearchParams(
      {
        event: params?.event ?? "sales",
        interval: params?.interval ?? "90d",
      },
    ).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    error,
    loading: partnerId && programId && !data && !error ? true : false,
  };
}

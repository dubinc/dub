import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function usePartnerAnalytics() {
  const { partnerId, programId } = useParams();

  const { data, error } = useSWR<any>(
    `/api/partners/${partnerId}/programs/${programId}/analytics?${new URLSearchParams(
      {
        event: "composite",
        interval: "all_unfiltered",
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

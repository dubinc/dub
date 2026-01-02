import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

interface UsePartnerCustomersCountProps<T> {
  groupBy?: "country" | "linkId";
  enabled?: boolean;
}

export default function usePartnerCustomersCount<T = number>({
  groupBy,
  enabled = true,
}: UsePartnerCustomersCountProps<T> = {}) {
  const { programSlug } = useParams<{ programSlug: string }>();

  const { data, error } = useSWR<T>(
    enabled && programSlug
      ? `/api/partner-profile/programs/${programSlug}/customers/count${groupBy ? `?groupBy=${groupBy}` : ""}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    error,
  };
}


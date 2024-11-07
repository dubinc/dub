import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DotsPayoutMethods } from "../dots/types";

export default function usePayoutMethods({
  partnerId,
}: {
  partnerId: string | null;
}) {
  const { data, error } = useSWR<DotsPayoutMethods>(
    partnerId ? `/api/partners/${partnerId}/payout-methods` : null,
    fetcher,
  );

  return {
    data,
    error,
    isLoading: !data && !error,
  };
}

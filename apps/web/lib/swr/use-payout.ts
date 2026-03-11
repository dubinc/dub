import { PayoutResponse } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function usePayout() {
  const { id: workspaceId } = useWorkspace();
  const { payoutId } = useParams<{ payoutId: string }>();

  const { data: payout, error } = useSWR<PayoutResponse>(
    workspaceId && payoutId
      ? `/api/payouts/${payoutId}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
  );

  return {
    payout,
    loading: !payout && !error,
    error,
  };
}

import { CommissionResponse } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

type CommissionDetail = CommissionResponse & {
  payoutId: string | null;
  reward: {
    description: string | null;
    type: "percentage" | "flat";
    event: "click" | "lead" | "sale";
    amountInCents: number | null;
    amountInPercentage: number | null;
  } | null;
  payout: {
    paidAt: string | null;
    initiatedAt: string | null;
    user: { id: string; name: string | null; image: string | null } | null;
  } | null;
};

export default function useCommission() {
  const { id: workspaceId } = useWorkspace();
  const { commissionId } = useParams<{ commissionId: string }>();

  const { data: commission, error } = useSWR<CommissionDetail>(
    workspaceId && commissionId
      ? `/api/commissions/${commissionId}?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
  );

  return {
    commission,
    loading: !commission && !error,
    error,
  };
}

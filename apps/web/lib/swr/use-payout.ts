"use client";

import { PayoutResponseSchema } from "@/lib/zod/schemas/payouts";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import * as z from "zod/v4";
import useWorkspace from "./use-workspace";

type PayoutDetail = Omit<
  z.infer<typeof PayoutResponseSchema>,
  | "periodStart"
  | "periodEnd"
  | "createdAt"
  | "updatedAt"
  | "initiatedAt"
  | "paidAt"
> & {
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt?: string;
  initiatedAt: string | null;
  paidAt: string | null;
};

export type { PayoutDetail };

export default function usePayout() {
  const { id: workspaceId } = useWorkspace();
  const { payoutId } = useParams<{ payoutId: string }>();

  const { data: payout, error } = useSWR<PayoutDetail>(
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

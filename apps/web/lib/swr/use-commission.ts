"use client";

import { CommissionDetailSchema } from "@/lib/zod/schemas/commissions";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import * as z from "zod/v4";
import useWorkspace from "./use-workspace";

type CommissionDetail = Omit<
  z.infer<typeof CommissionDetailSchema>,
  "createdAt" | "updatedAt" | "payout"
> & {
  createdAt: string;
  updatedAt: string;
  payout: {
    paidAt: string | null;
    initiatedAt: string | null;
    user: { id: string; name: string | null; image: string | null } | null;
  } | null;
};

export type { CommissionDetail };

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

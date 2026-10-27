"use client";

import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { CommissionDetail } from "../types";
import useWorkspace from "./use-workspace";

export function useCommission() {
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

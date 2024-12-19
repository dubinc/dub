import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { PayoutResponse } from "../types";
import { payoutsQuerySchema } from "../zod/schemas/payouts";
import useWorkspace from "./use-workspace";

export default function usePayouts({
  query,
}: {
  query?: z.input<typeof payoutsQuerySchema>;
} = {}) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: payouts, error } = useSWR<PayoutResponse[]>(
    `/api/programs/${programId}/payouts?${new URLSearchParams({
      workspaceId: workspaceId,
      ...query,
    } as Record<string, any>).toString()}`,
    fetcher,
  );

  return {
    payouts,
    error,
    loading: !payouts && !error,
  };
}

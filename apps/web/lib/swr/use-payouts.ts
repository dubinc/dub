import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { PayoutResponse } from "../types";
import { payoutsQuerySchema } from "../zod/schemas/payouts";
import useWorkspace from "./use-workspace";

export default function usePayouts({
  query,
}: {
  query?: z.input<typeof payoutsQuerySchema>;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data: payouts, error } = useSWR<PayoutResponse[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/payouts?${new URLSearchParams({
        workspaceId,
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

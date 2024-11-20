import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { PayoutsCount } from "../types";
import { payoutsQuerySchema } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

const partialQuerySchema = payoutsQuerySchema.partial();

export default function usePayoutsCount({
  query,
}: {
  query?: z.infer<typeof partialQuerySchema>;
} = {}) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: payoutsCount, error } = useSWR<PayoutsCount>(
    `/api/programs/${programId}/payouts/count?${new URLSearchParams({
      workspaceId: workspaceId,
      ...query,
    } as Record<string, any>).toString()}`,
    fetcher,
  );

  return {
    payoutsCount,
    error,
  };
}

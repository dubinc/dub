import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { rewardPartnersQuerySchema } from "../zod/schemas/rewards";
import useWorkspace from "./use-workspace";

const rewardPartnersPartialQuerySchema = rewardPartnersQuerySchema.partial();

export default function useRewardPartnersCount({
  query,
  enabled = true,
}: {
  query?: Omit<z.infer<typeof rewardPartnersPartialQuerySchema>, "page" | "pageSize">;
  enabled?: boolean;
}) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: partnersCount, error } = useSWR<number>(
    enabled && workspaceId && programId
      ? `/api/programs/${programId}/rewards/partners/count?${new URLSearchParams({
          workspaceId,
          programId,
          ...query,
        } as Record<string, any>).toString()}`
      : null,
    fetcher,
  );

  return {
    partnersCount,
    loading: typeof partnersCount === "undefined" && !error,
    error,
  };
} 
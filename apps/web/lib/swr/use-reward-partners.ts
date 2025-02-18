import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { PartnerProps } from "../types";
import { rewardPartnersQuerySchema } from "../zod/schemas/rewards";
import useWorkspace from "./use-workspace";

const rewardPartnersPartialQuerySchema = rewardPartnersQuerySchema.partial();

export default function useRewardPartners({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof rewardPartnersPartialQuerySchema>;
  enabled?: boolean;
}) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<PartnerProps[]>(
    enabled && workspaceId && programId
      ? `/api/programs/${programId}/rewards/partners?${new URLSearchParams({
          workspaceId,
          programId,
          ...query,
        } as Record<string, any>).toString()}`
      : null,
    fetcher,
  );

  return {
    data,
    loading: typeof data === "undefined" && !error,
    error,
  };
} 
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { EnrolledPartnerProps } from "../types";
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
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data, error, isLoading } = useSWR<EnrolledPartnerProps[]>(
    enabled && workspaceId && defaultProgramId
      ? `/api/programs/${defaultProgramId}/rewards/partners?${new URLSearchParams(
          {
            workspaceId,
            ...query,
          } as Record<string, any>,
        ).toString()}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    loading: isLoading,
    error,
  };
}

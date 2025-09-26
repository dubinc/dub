import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { getPlanCapabilities } from "../plan-capabilities";
import { countMessagesQuerySchema } from "../zod/schemas/messages";
import useWorkspace from "./use-workspace";

const partialQuerySchema = countMessagesQuerySchema.partial();

export function usePartnerMessagesCount({
  query,
  enabled = true,
  swrOpts,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
  swrOpts?: SWRConfiguration;
} = {}) {
  const { id: workspaceId, plan, defaultProgramId } = useWorkspace();

  console.log({
    enabled,
    workspaceId,
    defaultProgramId,
    plan,
    running:
      enabled &&
      workspaceId &&
      defaultProgramId &&
      getPlanCapabilities(plan).canMessagePartners,
  });

  const { data, isLoading, error, mutate } = useSWR<number>(
    enabled &&
      workspaceId &&
      defaultProgramId &&
      getPlanCapabilities(plan).canMessagePartners &&
      `/api/messages/count?${new URLSearchParams({
        workspaceId,
        ...(query as Record<string, string>),
      }).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOpts,
    },
  );

  return {
    count: data,
    isLoading,
    error,
    mutate,
  };
}

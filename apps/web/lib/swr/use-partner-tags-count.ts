import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import { getPartnerTagsCountQuerySchema } from "../zod/schemas/partner-tags";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getPartnerTagsCountQuerySchema.partial();

export function usePartnerTagsCount(
  {
    query,
    enabled = true,
  }: {
    query?: z.infer<typeof partialQuerySchema>;
    enabled?: boolean;
  } = {},
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<number>(
    enabled && workspaceId
      ? `/api/partners/tags/count?${new URLSearchParams({
          workspaceId: workspaceId,
          ...query,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOptions,
    },
  );

  return {
    partnerTagsCount: data,
    isLoading,
    error,
  };
}

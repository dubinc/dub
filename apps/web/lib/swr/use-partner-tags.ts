import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import { PartnerTagProps } from "../types";
import { getPartnerTagsQuerySchema } from "../zod/schemas/partner-tags";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getPartnerTagsQuerySchema.partial();

export function usePartnerTags(
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

  const { data, isLoading, error } = useSWR<PartnerTagProps[]>(
    enabled && workspaceId
      ? `/api/partners/tags?${new URLSearchParams({
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
    partnerTags: data,
    isLoading,
    error,
  };
}

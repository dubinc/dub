import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import useWorkspace from "../../swr/use-workspace";
import { getPartnerTagsCountQuerySchema } from "../../zod/schemas/partner-tags";

type UsePartnerTagsCountOptions = {
  query?: z.input<typeof getPartnerTagsCountQuerySchema>;
  enabled?: boolean;
  swrOptions?: SWRConfiguration;
};

export function usePartnerTagsCount({
  query,
  enabled = true,
  swrOptions,
}: UsePartnerTagsCountOptions = {}) {
  const { id: workspaceId } = useWorkspace();

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({
    workspaceId,
    ...query,
  })) {
    if (value == null) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const { data, isLoading, error } = useSWR<number>(
    enabled && workspaceId
      ? `/api/partner-tags/count?${params.toString()}`
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

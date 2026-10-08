import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import {
  listPartnerTagsQuerySchema,
  listPartnerTagsResponseSchema,
} from "../zod/schemas/partner-tags";
import useWorkspace from "./use-workspace";

type UsePartnerTagsOptions = {
  query?: z.infer<typeof listPartnerTagsQuerySchema>;
  enabled?: boolean;
  swrOptions?: SWRConfiguration;
};

export function usePartnerTags({
  query,
  enabled = true,
  swrOptions,
}: UsePartnerTagsOptions = {}) {
  const { id: workspaceId } = useWorkspace();

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({
    workspaceId,
    sortOrder: "asc",
    ...query,
  })) {
    if (value == null) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const { data, isLoading, error } = useSWR<
    z.infer<typeof listPartnerTagsResponseSchema>
  >(
    enabled && workspaceId
      ? `/api/partner-tags?${params.toString()}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOptions,
    },
  );

  return {
    partnerTags: data?.data,
    isLoading,
    error,
  };
}

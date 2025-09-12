import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { countMessagesQuerySchema } from "../zod/schemas/messages";

const partialQuerySchema = countMessagesQuerySchema.partial();

export function useProgramMessagesCount({
  query,
  enabled = true,
  swrOpts,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
  swrOpts?: SWRConfiguration;
} = {}) {
  const { data, isLoading, error, mutate } = useSWR<number>(
    enabled
      ? `/api/partner-profile/messages/count?${new URLSearchParams({
          ...(query as Record<string, string>),
        }).toString()}`
      : null,
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

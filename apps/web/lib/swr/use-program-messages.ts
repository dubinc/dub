import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import {
  ProgramMessagesSchema,
  getProgramMessagesQuerySchema,
} from "../zod/schemas/messages";

const partialQuerySchema = getProgramMessagesQuerySchema.partial();

export function useProgramMessages({
  query,
  enabled = true,
  swrOpts,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
  swrOpts?: SWRConfiguration;
} = {}) {
  const { data, isLoading, error, mutate } = useSWR<
    z.infer<typeof ProgramMessagesSchema> & { delivered?: false }
  >(
    enabled
      ? `/api/partner-profile/messages?${new URLSearchParams({
          ...(query as Record<string, string>),
        }).toString()}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      // a bit more aggresive since we want messages to be updated in real time
      refreshInterval: 500,
      refreshWhenHidden: true,
      ...swrOpts,
    },
  );

  return {
    programMessages: data,
    isLoading,
    error,
    mutate,
  };
}

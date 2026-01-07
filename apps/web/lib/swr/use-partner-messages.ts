import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import {
  PartnerMessagesSchema,
  getPartnerMessagesQuerySchema,
} from "../zod/schemas/messages";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getPartnerMessagesQuerySchema.partial();

export function usePartnerMessages({
  query,
  enabled = true,
  swrOpts,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
  swrOpts?: SWRConfiguration;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error, mutate } = useSWR<
    z.infer<typeof PartnerMessagesSchema> & { delivered?: false }
  >(
    enabled && workspaceId
      ? `/api/messages?${new URLSearchParams({
          workspaceId,
          ...(query as Record<string, string>),
        }).toString()}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      // a bit more aggresive since we want messages to be updated in real time
      refreshInterval: 500,
      ...swrOpts,
    },
  );

  return {
    partnerMessages: data,
    isLoading,
    error,
    mutate,
  };
}

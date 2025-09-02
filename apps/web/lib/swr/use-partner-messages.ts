import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import {
  PartnerMessagesSchema,
  getPartnerMessagesQuerySchema,
} from "../zod/schemas/messages";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getPartnerMessagesQuerySchema.partial();

export function usePartnerMessages({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<
    z.infer<typeof PartnerMessagesSchema>
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
    },
  );

  return {
    partnerMessages: data,
    isLoading,
    error,
  };
}

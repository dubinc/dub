import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import { hasPermission } from "../auth/partner-users/partner-user-permissions";
import {
  ProgramMessagesSchema,
  getProgramMessagesQuerySchema,
} from "../zod/schemas/messages";
import usePartnerProfile from "./use-partner-profile";

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
  const { partner } = usePartnerProfile();

  const isEnabled =
    enabled && partner?.role && hasPermission(partner.role, "messages.read");

  const { data, isLoading, error, mutate } = useSWR<
    z.infer<typeof ProgramMessagesSchema> & { delivered?: false }
  >(
    isEnabled
      ? `/api/partner-profile/messages?${new URLSearchParams({
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
    programMessages: data,
    isLoading,
    error,
    mutate,
  };
}

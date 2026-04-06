import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import { hasPermission } from "../auth/partner-users/partner-user-permissions";
import { countMessagesQuerySchema } from "../zod/schemas/messages";
import usePartnerProfile from "./use-partner-profile";

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
  const { partner } = usePartnerProfile();

  const isEnabled =
    enabled && partner?.role && hasPermission(partner.role, "messages.read");

  const { data, isLoading, error, mutate } = useSWR<number>(
    isEnabled
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

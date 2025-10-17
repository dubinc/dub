import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { EnrolledPartnerProps } from "../types";
import { getPartnersQuerySchemaExtended } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getPartnersQuerySchemaExtended.partial();

export default function usePartners(
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

  const { data, isLoading, error } = useSWR<EnrolledPartnerProps[]>(
    enabled && workspaceId
      ? `/api/partners?${new URLSearchParams({
          workspaceId: workspaceId,
          ...query,
          includeExpandedFields: true,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOptions,
    },
  );

  return {
    partners: data,
    loading: isLoading,
    error,
  };
}

import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { EnrolledPartnerProps } from "../types";
import { discountPartnersQuerySchema } from "../zod/schemas/discount";
import useWorkspace from "./use-workspace";

const discountPartnersPartialQuerySchema =
  discountPartnersQuerySchema.partial();

export default function useDiscountPartners({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof discountPartnersPartialQuerySchema>;
  enabled?: boolean;
}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data, error, isLoading } = useSWR<EnrolledPartnerProps[]>(
    enabled && workspaceId && defaultProgramId
      ? `/api/programs/${defaultProgramId}/discounts/partners?${new URLSearchParams(
          {
            workspaceId,
            ...query,
          } as Record<string, any>,
        ).toString()}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    loading: isLoading,
    error,
  };
}

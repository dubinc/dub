import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
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
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data, error, isLoading } = useSWR<EnrolledPartnerProps[]>(
    enabled && workspaceId && programId
      ? `/api/programs/${programId}/discounts/partners?${new URLSearchParams({
          workspaceId,
          programId,
          ...query,
        } as Record<string, any>).toString()}`
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

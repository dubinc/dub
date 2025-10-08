import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DiscountCodeProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useDiscountCodes({
  partnerId,
  enabled = true,
}: {
  partnerId: string | null;
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data: discountCodes, error } = useSWR<DiscountCodeProps[]>(
    enabled && workspaceId && partnerId
      ? `/api/discount-codes?partnerId=${partnerId}&workspaceId=${workspaceId}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    discountCodes,
    loading: !discountCodes && !error,
    error,
  };
}

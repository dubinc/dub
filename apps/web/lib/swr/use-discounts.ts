import { getDiscountsQuerySchema } from "@/lib/api/discounts/list-discounts";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import { DiscountProps } from "../types";
import useWorkspace from "./use-workspace";

export type DiscountListItem = DiscountProps & {
  groupId?: string | null;
  partnersCount?: number;
};

export function useDiscounts(
  opts: z.infer<typeof getDiscountsQuerySchema> = {},
  swrOpts: SWRConfiguration = {},
) {
  const { groupId } = opts;
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const searchParams = new URLSearchParams({
    ...(workspaceId && { workspaceId }),
    ...(groupId && { groupId }),
  });

  const requiresGroup = "groupId" in opts;
  const canFetch =
    workspaceId && defaultProgramId && (!requiresGroup || groupId);

  const { data: discounts, error } = useSWR<DiscountListItem[]>(
    canFetch ? `/api/discounts?${searchParams}` : null,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: !groupId,
      ...swrOpts,
    },
  );

  return {
    discounts,
    loading: Boolean(canFetch) && !discounts && !error,
    error,
  };
}

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

export function useDiscounts({
  groupId,
  swrOpts,
}: z.infer<typeof getDiscountsQuerySchema> & {
  swrOpts?: SWRConfiguration;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const searchParams = new URLSearchParams({
    ...(workspaceId && { workspaceId }),
    ...(groupId && { groupId }),
  });

  const { data: discounts, error } = useSWR<DiscountListItem[]>(
    workspaceId && defaultProgramId && `/api/discounts?${searchParams}`,
    fetcher,
    {
      dedupingInterval: 60000,
      ...swrOpts,
    },
  );

  return {
    discounts,
    loading: !discounts && !error,
    error,
  };
}

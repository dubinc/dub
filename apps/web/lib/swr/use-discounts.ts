import { buildSearchParams, fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { DiscountProps } from "../types";
import { getDiscountsQuerySchema } from "../zod/schemas/discount";
import useWorkspace from "./use-workspace";

export function useDiscounts({
  groupId,
}: z.infer<typeof getDiscountsQuerySchema> = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const searchParams = buildSearchParams({
    workspaceId,
    groupId,
  });

  const { data: discounts, error } = useSWR<DiscountProps[]>(
    workspaceId && defaultProgramId && `/api/discounts?${searchParams}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    discounts,
    loading: !discounts && !error,
    error,
  };
}

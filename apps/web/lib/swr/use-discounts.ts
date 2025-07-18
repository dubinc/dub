import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DiscountProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useDiscounts() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data: discounts, error } = useSWR<DiscountProps[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/discounts?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    discounts,
    loading: !discounts && !error,
    error,
  };
}

import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { DiscountProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useDiscounts() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: discounts, error } = useSWR<DiscountProps[]>(
    programId &&
      workspaceId &&
      `/api/programs/${programId}/discounts?workspaceId=${workspaceId}`,
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

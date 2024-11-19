import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PayoutsCount } from "../types";
import useWorkspace from "./use-workspace";

export default function usePayoutsCount() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: payoutsCount, error } = useSWR<PayoutsCount>(
    `/api/programs/${programId}/payouts/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  return {
    payoutsCount,
    error,
  };
}

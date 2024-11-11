import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { SalesCount } from "../types";
import useWorkspace from "./use-workspace";

export default function useSalesCount() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: salesCount, error } = useSWR<SalesCount>(
    `/api/programs/${programId}/sales/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  return {
    salesCount,
    error,
  };
}

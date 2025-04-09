import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useCustomersCount() {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<number>(
    `/api/customers/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  return {
    data,
    error,
  };
}

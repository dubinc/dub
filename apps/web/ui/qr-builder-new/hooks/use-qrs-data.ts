import useWorkspace from "@/lib/swr/use-workspace.ts";
import useSWR from "swr";
import { TQrServerData } from "../helpers/data-converters";

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch all QRs using SWR
 */
export const useQrsData = () => {
  const { id: workspaceId } = useWorkspace();

  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? `/api/qrs?workspaceId=${workspaceId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  return {
    qrs: data?.qrs as TQrServerData[] | undefined,
    isLoading,
    isError: error,
    mutate,
  };
};

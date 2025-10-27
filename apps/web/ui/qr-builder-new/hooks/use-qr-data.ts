import useWorkspace from "@/lib/swr/use-workspace.ts";
import useSWR from "swr";
import { TQrServerData } from "../helpers/data-converters";

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch a single QR by ID using SWR
 */
export const useQrData = (qrId: string | null) => {
  const { id: workspaceId } = useWorkspace();

  const { data, error, isLoading, mutate } = useSWR(
    qrId && workspaceId ? `/api/qrs/${qrId}?workspaceId=${workspaceId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    qrData: data?.qr as TQrServerData | undefined,
    isLoading,
    isError: error,
    mutate,
  };
};

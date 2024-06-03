import { fetcher } from "@dub/utils";
import { toast } from "sonner";
import useSWR from "swr";

export function useOptimisticUpdate<T>(
  url: string,
  toastCopy?: { loading: string; success: string; error: string },
) {
  const { data, isLoading, mutate } = useSWR<T>(url, fetcher);

  return {
    data,
    isLoading,
    update: async (fn: (data: T) => Promise<T>, optimisticData: T) => {
      return toast.promise(
        mutate(fn(data as T), {
          optimisticData,
          rollbackOnError: true,
          populateCache: true,
          revalidate: true,
        }),
        {
          loading: toastCopy?.loading || "Updating...",
          success: toastCopy?.success || "Successfully updated",
          error: toastCopy?.error || "Failed to update",
        },
      );
    },
  };
}

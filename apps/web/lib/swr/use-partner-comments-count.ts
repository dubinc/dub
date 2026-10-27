import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import useWorkspace from "./use-workspace";

export function usePartnerCommentsCount(
  {
    partnerId,
  }: {
    partnerId: string;
  },
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error, mutate } = useSWR<number>(
    workspaceId
      ? `/api/partners/${partnerId}/comments/count?${new URLSearchParams({
          workspaceId,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
    swrOptions,
  );

  return {
    count: data,
    loading: isLoading,
    error,
    mutate,
  };
}

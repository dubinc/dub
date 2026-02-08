import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { PartnerCommentProps } from "../types";
import useWorkspace from "./use-workspace";

export function usePartnerComments(
  {
    partnerId,
  }: {
    partnerId: string;
  },
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error, mutate } = useSWR<
    (PartnerCommentProps & { delivered?: false })[]
  >(
    workspaceId
      ? `/api/partners/${partnerId}/comments?${new URLSearchParams({
          workspaceId,
        } as Record<string, any>).toString()}`
      : undefined,
    fetcher,
    swrOptions,
  );

  return {
    comments: data,
    loading: isLoading,
    error,
    mutate,
  };
}

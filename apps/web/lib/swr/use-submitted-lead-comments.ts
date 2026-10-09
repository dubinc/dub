import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { SubmittedLeadCommentProps } from "../types";
import useWorkspace from "./use-workspace";

export function useSubmittedLeadComments(
  {
    leadId,
  }: {
    leadId: string;
  },
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data, isLoading, error, mutate } = useSWR<
    (SubmittedLeadCommentProps & { delivered?: false })[]
  >(
    workspaceId && defaultProgramId
      ? `/api/programs/${defaultProgramId}/submitted-leads/${leadId}/comments?${new URLSearchParams(
          { workspaceId },
        ).toString()}`
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

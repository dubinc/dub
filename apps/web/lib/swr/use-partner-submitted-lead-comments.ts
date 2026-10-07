import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import { SubmittedLeadCommentProps } from "../types";

export function usePartnerSubmittedLeadComments(
  {
    leadId,
  }: {
    leadId: string;
  },
  swrOptions: SWRConfiguration = {},
) {
  const { programSlug } = useParams<{ programSlug: string }>();

  const { data, isLoading, error, mutate } = useSWR<
    (SubmittedLeadCommentProps & { delivered?: false })[]
  >(
    programSlug
      ? `/api/partner-profile/programs/${programSlug}/submitted-leads/${leadId}/comments`
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

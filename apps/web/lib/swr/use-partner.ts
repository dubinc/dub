import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { EnrolledPartnerExtendedProps } from "../types";
import useWorkspace from "./use-workspace";

export default function usePartner(
  {
    partnerId,
  }: {
    partnerId: string | null;
  },
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<EnrolledPartnerExtendedProps>(
    partnerId &&
      workspaceId &&
      `/api/partners/${partnerId}?workspaceId=${workspaceId}`,
    fetcher,
    swrOptions,
  );

  return {
    partner: data,
    loading: isLoading,
    error,
  };
}

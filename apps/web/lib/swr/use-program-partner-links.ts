import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { EnrolledPartnerProps } from "../types";
import useWorkspace from "./use-workspace";

type UseProgramPartnerLinksProps = {
  partnerId: string | null;
};

export function useProgramPartnerLinks(
  { partnerId }: UseProgramPartnerLinksProps,
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const {
    data: links,
    error,
    isValidating,
  } = useSWR<NonNullable<EnrolledPartnerProps["links"]>>(
    partnerId && workspaceId
      ? `/api/partners/links?partnerId=${partnerId}&workspaceId=${workspaceId}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOptions,
    },
  );

  return {
    links,
    loading: !links && !error,
    error,
    isValidating,
  };
}

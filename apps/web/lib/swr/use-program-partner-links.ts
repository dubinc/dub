import { ProgramPartnerLinkSchemaInternal } from "@/lib/zod/schemas/programs";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import useWorkspace from "./use-workspace";

type UseProgramPartnerLinksProps = {
  partnerId: string | null;
};

export type ProgramPartnerLinkExtended = z.infer<
  typeof ProgramPartnerLinkSchemaInternal
>;

export function useProgramPartnerLinks(
  { partnerId }: UseProgramPartnerLinksProps,
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const {
    data: links,
    error,
    isValidating,
  } = useSWR<ProgramPartnerLinkExtended[]>(
    partnerId && workspaceId
      ? `/api/partners/links?partnerId=${partnerId}&workspaceId=${workspaceId}&includeRewards=true`
      : null,
    fetcher,
    swrOptions,
  );

  return {
    links,
    loading: !links && !error,
    error,
    isValidating,
  };
}

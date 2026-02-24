import useWorkspace from "@/lib/swr/use-workspace";
import { getPartnerReferralsCountQuerySchema } from "@/lib/zod/schemas/referrals";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";

export function useProgramReferralsCount<T = number>({
  query,
  ignoreParams,
  enabled = true,
}: {
  query?: z.infer<typeof getPartnerReferralsCountQuerySchema>;
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error, isLoading } = useSWR<T>(
    enabled &&
      workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/referrals/count${getQueryString(
        { workspaceId, ...query },
        {
          include: ignoreParams ? [] : ["partnerId", "status", "search"],
        },
      )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    loading: isLoading,
  };
}

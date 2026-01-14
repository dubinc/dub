import useWorkspace from "@/lib/swr/use-workspace";
import { getPartnerReferralsCountQuerySchema } from "@/lib/zod/schemas/partner-referrals";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";

export function usePartnerReferralsCount<T = number>({
  query,
  enabled = true,
  includeParams = ["partnerId", "status", "search"],
}: {
  query?: z.infer<typeof getPartnerReferralsCountQuerySchema>;
  enabled?: boolean;
  includeParams?: string[];
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error, isLoading } = useSWR<T>(
    enabled &&
      workspaceId &&
      `/api/programs/partner-referrals/count${getQueryString(
        { workspaceId, ...query },
        {
          include: includeParams,
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

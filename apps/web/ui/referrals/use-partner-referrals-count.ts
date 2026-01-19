import useWorkspace from "@/lib/swr/use-workspace";
import { getPartnerReferralsCountQuerySchema } from "@/lib/zod/schemas/referrals";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";

export function usePartnerReferralsCount<T = number>({
  query,
  includeParams = ["partnerId", "status", "search"],
}: {
  query?: z.infer<typeof getPartnerReferralsCountQuerySchema>;
  includeParams?: string[];
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error, isLoading } = useSWR<T>(
    workspaceId &&
      `/api/programs/referrals/count${getQueryString(
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

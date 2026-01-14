import { getPartnerReferralsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import * as z from "zod/v4";

export default function usePartnerReferralsCount<T = number>({
  query,
  includeParams = ["status", "search"],
  enabled = true,
}: {
  query?: Partial<z.infer<typeof getPartnerReferralsCountQuerySchema>>;
  includeParams?: string[];
  enabled?: boolean;
} = {}) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<T>(
    enabled &&
      programSlug &&
      `/api/partner-profile/programs/${programSlug}/referrals/count${getQueryString(
        query
          ? Object.fromEntries(
              Object.entries(query).filter(
                ([_, v]) => v !== undefined && v !== null && v !== "",
              ),
            )
          : undefined,
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
  };
}

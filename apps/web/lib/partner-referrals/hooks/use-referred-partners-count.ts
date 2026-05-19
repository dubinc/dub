import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import * as z from "zod/v4";
import { getReferredPartnersCountQuerySchema } from "../schemas";

export function useReferredPartnersCount<T = number>({
  query,
  includeParams = ["country", "status"],
  enabled = true,
}: {
  query?: z.infer<typeof getReferredPartnersCountQuerySchema>;
  includeParams?: string[];
  enabled?: boolean;
} = {}) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<T>(
    enabled &&
      programSlug &&
      `/api/partner-profile/programs/${programSlug}/referrals/count${getQueryString(
        query,
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

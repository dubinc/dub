import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function usePartnerEarningsCount<T>(opts?: {
  groupBy?: string;
  programId?: string;
  enabled?: boolean;
}) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];
  const { programSlug } = useParams();
  const programIdToUse = opts?.programId ?? programSlug;

  const { getQueryString } = useRouterStuff();

  const { data: earningsCount, error } = useSWR(
    programIdToUse &&
      partnerId &&
      opts?.enabled &&
      `/api/partner-profile/programs/${programIdToUse}/earnings/count${getQueryString(
        opts,
        {
          include: [
            "linkId",
            "customerId",
            "status",
            "interval",
            "start",
            "end",
          ],
        },
      )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    earningsCount: earningsCount as T,
    error,
    loading: !earningsCount && !error,
  };
}

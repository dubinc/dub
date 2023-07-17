import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher, getQueryString } from "#/lib/utils";

export default function useLinksCount({
  groupBy,
}: {
  groupBy?: "domain" | "tagId";
} = {}) {
  const router = useRouter();

  const { data, error } = useSWR<any>(
    router.isReady &&
      `/api/links/_count${getQueryString(
        router,
        groupBy ? { groupBy } : undefined,
      )}`,
    fetcher,
    {
      dedupingInterval: 30000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    loading: !error && !data,
    error,
  };
}

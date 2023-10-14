import { fetcher, getQueryString } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";

export default function useLinksCount({
  groupBy,
}: {
  groupBy?: "domain" | "tagId";
} = {}) {
  const params = useParams() as { slug?: string };
  const searchParams = useSearchParams();

  const { data, error } = useSWR<any>(
    `/api/links/_count${getQueryString({
      params,
      searchParams,
      ...(groupBy && { groupBy }),
    })}`,
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

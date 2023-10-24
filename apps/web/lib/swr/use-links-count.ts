import { fetcher, getQueryString } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";

export default function useLinksCount({
  groupBy,
}: {
  groupBy?: "domain" | "tagId";
} = {}) {
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();

  const { data, error } = useSWR<any>(
    `/api${slug ? `/projects/${slug}` : ""}/links/count${getQueryString({
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

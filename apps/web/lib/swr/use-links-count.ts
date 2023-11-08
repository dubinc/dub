import { fetcher } from "@dub/utils";
import { useRouterStuff } from "@dub/ui";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function useLinksCount({
  groupBy,
}: {
  groupBy?: "domain" | "tagId";
} = {}) {
  const { slug } = useParams() as { slug?: string };
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<any>(
    `/api/links/count${getQueryString({
      ...(slug && { projectSlug: slug }),
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

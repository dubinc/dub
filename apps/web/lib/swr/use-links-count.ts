import { fetcher, getQueryString } from "@dub/utils";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";

export default function useLinksCount({
  groupBy,
}: {
  groupBy?: "domain" | "tagId";
} = {}) {
  const pathname = usePathname();
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();

  const { data, error } = useSWR<any>(
    `/api${slug ? `/projects/${slug}` : ""}/links/count${
      // only include query params if we're on the project links page
      pathname === `/${slug}` || pathname === "/links"
        ? getQueryString({
            searchParams,
            ...(groupBy && { groupBy }),
          })
        : ""
    }`,
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

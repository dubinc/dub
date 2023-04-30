import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher, getQueryString } from "@/lib/utils";

export default function useLinksCount({ groupBy }: { groupBy: "domain" }) {
  const router = useRouter();

  const { slug } = router.query as {
    slug: string;
  };

  const { data, error } = useSWR<
    {
      [groupBy]: string;
      _count: number;
    }[]
  >(
    router.isReady &&
      `${
        slug ? `/api/projects/${slug}/links/count` : `/api/links/count`
      }${getQueryString(router, groupBy ? { groupBy } : undefined)}`,
    fetcher,
    {
      dedupingInterval: 10000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    loading: !error && !data,
    error,
  };
}

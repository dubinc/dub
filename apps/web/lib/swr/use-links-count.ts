import { fetcher } from "@dub/utils";
import { useRouterStuff } from "@dub/ui";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useEffect, useState } from "react";
export default function useLinksCount({
  groupBy,
}: {
  groupBy?: "domain" | "tagId";
} = {}) {
  const { slug } = useParams() as { slug?: string };
  const { getQueryString } = useRouterStuff();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  const { data, error } = useSWR<any>(
    slug
      ? `/api/links/count${getQueryString(
          {
            projectSlug: slug,
            ...(groupBy && { groupBy }),
          },
          {
            ignore: ["import", "upgrade"],
          },
        )}`
      : admin
      ? `/api/admin/links/count${getQueryString({
          ...(groupBy && { groupBy }),
        })}`
      : null,
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

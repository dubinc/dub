import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useEffect, useState } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useLinksCount({
  groupBy,
}: {
  groupBy?: "domain" | "tagId";
} = {}) {
  const { id } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  const { data, error } = useSWR<any>(
    id
      ? `/api/links/count${getQueryString(
          {
            workspaceId: id,
            ...(groupBy && { groupBy }),
          },
          {
            ignore: ["import", "upgrade", "newLink"],
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

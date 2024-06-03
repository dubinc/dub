import { fetcher } from "@dub/utils";
import { useEffect, useState } from "react";
import { ShortLinkProps } from "src/types";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useLinks() {
  const { id } = useWorkspace();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  const { data: links, isValidating } = useSWR<ShortLinkProps[]>(
    id
      ? `/api/links?workspaceId=${id}&includeUser=true`
      : admin
        ? `/api/admin/links`
        : null,
    fetcher,
    {
      dedupingInterval: 20000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  return {
    links,
    isValidating,
  };
}

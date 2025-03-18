import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useEffect, useState } from "react";
import useSWR from "swr";
import z from "../zod";
import { getLinksCountQuerySchema } from "../zod/schemas/links";
import { useIsMegaFolder } from "./use-is-mega-folder";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getLinksCountQuerySchema.partial();

export default function useLinksCount<T = any>({
  query,
  ignoreParams,
  enabled = true,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultFolderId } = useWorkspace();
  const { getQueryString, searchParams } = useRouterStuff();
  const { isMegaFolder } = useIsMegaFolder();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  // Decide on the folderId to use
  let folderId = searchParams.get("folderId");
  if (!folderId && defaultFolderId) {
    folderId = defaultFolderId;
  } else if (folderId) {
    folderId = folderId !== "unsorted" ? folderId : "";
  } else {
    folderId = "";
  }

  const { data, error } = useSWR<any>(
    workspaceId && !isMegaFolder && enabled
      ? `/api/links/count${getQueryString(
          {
            workspaceId,

            ...query,
            folderId,
          },
          ignoreParams
            ? { include: [] }
            : {
                exclude: ["import", "upgrade", "newLink"],
              },
        )}`
      : admin
        ? `/api/admin/links/count${getQueryString({
            ...query,
          })}`
        : null,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    data: data as T,
    loading: !error && data === undefined,
    error,
  };
}

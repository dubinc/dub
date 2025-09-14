import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { getLinksQuerySchemaExtended } from "../zod/schemas/links";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getLinksQuerySchemaExtended.partial();

export default function useQrs(
  opts: z.infer<typeof partialQuerySchema> = {},
  swrOpts: SWRConfiguration = {},
  listenOnly: boolean = false,
  noFirstLoad: boolean = false,
) {
  const { data: session } = useSession() as
    | {
        data: { user: { id: string } };
      }
    | { data: null };
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  // If listenOnly is true, use standard params to read from the same cache as the main data fetcher
  const queryParams = listenOnly 
    ? { sortBy: "createdAt", showArchived: true, ...opts }
    : opts;

  const {
    data: qrs,
    isValidating,
    error,
  } = useSWR<QrStorageData[]>(
    workspaceId
      ? `/api/qrs${getQueryString(
          {
            workspaceId,
            userId: session?.user?.id,
            ...queryParams,
          },
          {
            exclude: ["import", "upgrade", "newLink"],
          },
        )}`
      : admin
        ? `/api/admin/qrs${getQueryString(queryParams)}`
        : null,
    listenOnly ? null : fetcher, // Don't fetch if listening only
    {
      dedupingInterval: 20000,
      revalidateOnFocus: false,
      keepPreviousData: true,
      revalidateOnMount: !listenOnly,
      revalidateOnReconnect: !listenOnly,
      ...swrOpts,
    },
  );

  return {
    qrs,
    isValidating,
    error,
  };
}

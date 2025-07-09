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

  const {
    data: qrs,
    isValidating,
    error,
  } = useSWR<QrStorageData[]>(
    workspaceId
      ? `/api/qrs${getQueryString(
          {
            workspaceId,
            includeUser: "true",
            includeWebhooks: "true",
            includeDashboard: "true",
            userId: session?.user?.id,
            ...opts,
          },
          {
            exclude: ["import", "upgrade", "newLink"],
          },
        )}`
      : admin
        ? `/api/admin/qrs${getQueryString(opts)}`
        : null,
    fetcher,
    {
      dedupingInterval: 20000,
      revalidateOnFocus: false,
      keepPreviousData: true,
      ...swrOpts,
    },
  );

  return {
    qrs,
    isValidating,
    error,
  };
}

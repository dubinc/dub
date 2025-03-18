import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useEffect, useState } from "react";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { ExpandedLinkProps, UserProps } from "../types";
import { getLinksQuerySchemaExtended } from "../zod/schemas/links";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getLinksQuerySchemaExtended.partial();

export default function useLinks(
  opts: z.infer<typeof partialQuerySchema> = {},
  swrOpts: SWRConfiguration = {},
) {
  const { id: workspaceId, defaultFolderId } = useWorkspace();
  const { getQueryString, searchParams } = useRouterStuff();

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

  const {
    data: links,
    isValidating,
    error,
  } = useSWR<
    (ExpandedLinkProps & {
      user: UserProps;
    })[]
  >(
    workspaceId
      ? `/api/links${getQueryString(
          {
            workspaceId,
            includeUser: "true",
            includeWebhooks: "true",
            includeDashboard: "true",
            folderId,
            ...opts,
          },
          {
            exclude: ["import", "upgrade", "newLink"],
          },
        )}`
      : admin
        ? `/api/admin/links${getQueryString(opts)}`
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
    links,
    isValidating,
    error,
  };
}

import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useEffect, useState } from "react";
import useSWR, { SWRConfiguration } from "swr";
import { z } from "zod";
import { ExpandedLinkProps, UserProps } from "../types";
import { getLinksQuerySchemaExtended } from "../zod/schemas/links";
import { useIsMegaWorkspace } from "./use-is-mega-workspace";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getLinksQuerySchemaExtended.partial();

export default function useLinks(
  opts: z.infer<typeof partialQuerySchema> = {},
  swrOpts: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const { isMegaWorkspace } = useIsMegaWorkspace();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

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
            includeDashboard: "true",
            ...opts,
            // don't show archived on mega workspaces
            ...(isMegaWorkspace
              ? {
                  showArchived: "false",
                }
              : {}),
          },
          {
            include: [
              "folderId",
              "tagIds",
              "domain",
              "userId",
              "search",
              "page",
              "sortBy",
              "sortOrder",
              "showArchived",
            ],
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

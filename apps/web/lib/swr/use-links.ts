import { useCurrentSubdomain, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
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
  const { id: workspaceId, isMegaWorkspace } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { subdomain } = useCurrentSubdomain();

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
      : subdomain === "admin"
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

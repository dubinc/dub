import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { z } from "zod";
import { LinkWithTagsProps, UserProps } from "../types";
import { getLinksQuerySchema } from "../zod/schemas/links";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getLinksQuerySchema.partial();

export default function useLinks(
  opts: z.infer<typeof partialQuerySchema> = {},
) {
  const { id } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  const { data: links, isValidating } = useSWR<
    (LinkWithTagsProps & {
      user: UserProps;
    })[]
  >(
    id
      ? `/api/links${getQueryString(
          { workspaceId: id, includeUser: "true", ...opts },
          {
            ignore: ["import", "upgrade", "newLink"],
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
    },
  );

  return {
    links,
    isValidating,
  };
}

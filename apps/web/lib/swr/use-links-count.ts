import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useEffect, useState } from "react";
import useSWR from "swr";
import z from "../zod";
import { getLinksCountQuerySchema } from "../zod/schemas/links";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getLinksCountQuerySchema.partial();

export default function useLinksCount(
  opts: z.infer<typeof partialQuerySchema> & { ignoreParams?: boolean } = {},
) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  const { data, error } = useSWR<any>(
    workspaceId
      ? `/api/links/count${
          opts.ignoreParams
            ? `?workspaceId=${workspaceId}`
            : getQueryString(
                {
                  workspaceId,
                  ...opts,
                },
                {
                  ignore: ["import", "upgrade", "newLink"],
                },
              )
        }`
      : admin
        ? `/api/admin/links/count${getQueryString({
            ...opts,
          })}`
        : null,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    loading: !error && !data,
    error,
  };
}

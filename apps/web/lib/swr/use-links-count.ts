import { useCurrentSubdomain, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
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
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const { isMegaFolder } = useIsMegaFolder();
  const { subdomain } = useCurrentSubdomain();

  const { data, error } = useSWR<any>(
    workspaceId && !isMegaFolder && enabled
      ? `/api/links/count${getQueryString(
          {
            workspaceId,
            ...query,
          },
          ignoreParams
            ? { include: [] }
            : {
                exclude: ["import", "upgrade", "newLink"],
              },
        )}`
      : subdomain === "admin"
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

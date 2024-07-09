import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import z from "../zod";
import { getLinksCountQuerySchema } from "../zod/schemas/links";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getLinksCountQuerySchema.partial();

export default function useLinksCount(
  opts: z.infer<typeof partialQuerySchema> = {},
) {
  const { id, slug } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const pathname = usePathname();
  const isLinksPage = pathname === `/${slug}`;

  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (window.location.host.startsWith("admin.")) {
      setAdmin(true);
    }
  }, []);

  const { data, error } = useSWR<any>(
    id
      ? `/api/links/count${getQueryString(
          {
            workspaceId: id,
            ...opts,
          },
          {
            ignore: [
              "import",
              "upgrade",
              "newLink",
              ...(!isLinksPage ? ["search"] : []),
            ],
          },
        )}`
      : admin
        ? `/api/admin/links/count${getQueryString({
            ...opts,
          })}`
        : null,
    fetcher,
    {
      dedupingInterval: 30000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    loading: !error && !data,
    error,
  };
}

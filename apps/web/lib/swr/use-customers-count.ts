import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import z from "../zod";
import { getCustomersCountQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

export default function useCustomersCount<T = number>({
  query,
  enabled = true,
}: {
  query?: z.infer<typeof getCustomersCountQuerySchema>;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<T>(
    enabled &&
      workspaceId &&
      `/api/customers/count${getQueryString(
        { workspaceId, ...query },
        {
          include: ["linkId", "country", "search"],
        },
      )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
  };
}

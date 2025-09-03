import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { getTagsCountQuerySchema } from "../zod/schemas/tags";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getTagsCountQuerySchema.partial();

export default function useTagsCount({
  query,
}: { query?: z.infer<typeof partialQuerySchema> } = {}) {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<number>(
    workspaceId &&
      `/api/tags/count?${new URLSearchParams({ workspaceId, ...query } as Record<string, any>).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    loading: !error && data === undefined,
    error,
  };
}

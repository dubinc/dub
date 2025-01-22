import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { getTagsCountQuerySchema } from "../zod/schemas/tags";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getTagsCountQuerySchema.partial();

export default function useFoldersCount({
  query,
}: { query?: z.infer<typeof partialQuerySchema> } = {}) {
  const { id } = useWorkspace();

  const { data, error } = useSWR<number>(
    id &&
      `/api/folders/count?${new URLSearchParams({ workspaceId: id, ...query }).toString()}`,
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

import { TagProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { getTagsQuerySchema } from "../zod/schemas/tags";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getTagsQuerySchema.partial();

export default function useTags({
  query,
  enabled = true,
  includeLinksCount = false,
}: {
  query?: z.infer<typeof partialQuerySchema>;
  enabled?: boolean;
  includeLinksCount?: boolean;
} = {}) {
  const { id } = useWorkspace();

  const { data: tags, isValidating } = useSWR<TagProps[]>(
    id &&
      enabled &&
      `/api/tags?${new URLSearchParams({
        workspaceId: id,
        ...query,
        includeLinksCount,
      } as Record<string, any>).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    tags,
    loading: tags ? false : true,
    isValidating,
  };
}

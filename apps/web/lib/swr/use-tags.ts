import { TagProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useTags() {
  const { id } = useWorkspace();

  const { data: tags, isValidating } = useSWR<TagProps[]>(
    id && `/api/tags?workspaceId=${id}`,
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

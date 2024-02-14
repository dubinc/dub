import { TagProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function useTags() {
  const { slug } = useParams() as { slug?: string };

  const { data: tags, isValidating } = useSWR<TagProps[]>(
    slug && `/api/tags?projectSlug=${slug}`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  return {
    tags,
    loading: tags ? false : true,
    isValidating,
  };
}

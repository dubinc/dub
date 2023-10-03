import { useRouter } from "next/router";
import useSWR from "swr";
import { TagProps } from "#/lib/types";
import { fetcher } from "#/lib/utils";

export default function useTags() {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };

  const { data: tags, isValidating } = useSWR<TagProps[]>(
    slug && `/api/projects/${slug}/tags`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  return {
    tags: slug ? tags : [],
    loading: tags ? false : true,
    isValidating,
  };
}

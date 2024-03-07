import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function useDefaultDomains() {
  const { slug } = useParams() as {
    slug: string;
  };

  const { data, error, mutate } = useSWR<string[]>(
    slug && `/api/projects/${slug}/domains/default`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    defaultDomains: data,
    loading: !data && !error,
    mutate,
    error,
  };
}

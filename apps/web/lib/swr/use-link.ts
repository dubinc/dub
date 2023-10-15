import { fetcher } from "@dub/utils";
import { type Link as LinkProps } from "@prisma/client";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function useLink() {
  const { key } = useParams() as {
    key: string;
  };

  const { data: link, error } = useSWR<LinkProps>(
    key && `/api/links/${encodeURIComponent(key)}`,
    fetcher,
    {
      dedupingInterval: 10000,
    },
  );

  return {
    link,
    loading: !error && !link,
    error,
  };
}

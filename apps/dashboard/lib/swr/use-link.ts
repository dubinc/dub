import { useRouter } from "next/router";
import useSWR from "swr";
import { type Link as LinkProps } from "@prisma/client";
import { fetcher } from "#/lib/utils";

export default function useLink() {
  const router = useRouter();

  const { key } = router.query as {
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

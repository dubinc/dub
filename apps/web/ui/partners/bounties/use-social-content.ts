import { SocialContent } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

interface UseSocialContentParams {
  url: string;
}

export function useSocialContent({ url }: UseSocialContentParams) {
  const searchParams = new URLSearchParams({ url });

  const { data, error, isValidating, mutate } = useSWR<SocialContent>(
    url ? `/api/social-content-stats?${searchParams.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  return {
    data: data ?? null,
    error,
    isValidating,
    mutate,
  };
}

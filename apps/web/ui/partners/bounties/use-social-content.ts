import { SocialContent } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

interface UseSocialContentParams {
  bountyId: string;
  url: string;
}

export function useSocialContent({ bountyId, url }: UseSocialContentParams) {
  const { programSlug } = useParams<{ programSlug?: string }>();

  const searchParams = new URLSearchParams({ url });

  const { data, error, isValidating, mutate } = useSWR<SocialContent>(
    programSlug && bountyId && url
      ? `/api/partner-profile/programs/${programSlug}/bounties/${bountyId}/social-content-stats?${searchParams.toString()}`
      : null,
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

import { textFetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";

export default function useGuide(guideKey: string, swrOpts?: SWRConfiguration) {
  const { data: guideMarkdown, error } = useSWR(
    `/api/docs/guides/${guideKey}.md`,
    textFetcher,
    {
      keepPreviousData: true,
      ...swrOpts,
    },
  );

  return {
    guideMarkdown,
    error,
    loading: !guideMarkdown && !error,
  };
}

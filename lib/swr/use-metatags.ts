import useSWR from "swr";
import { MetatagsProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { useDebounce } from "use-debounce";

export default function useMetatags(debouncedUrl: string, generate: boolean) {
  const { data, isValidating } = useSWR<MetatagsProps>(
    generate && `/api/edge/metatags?url=${debouncedUrl}`,
    fetcher,
  );

  return {
    metatags: data,
    generatingMetatags: isValidating,
  };
}

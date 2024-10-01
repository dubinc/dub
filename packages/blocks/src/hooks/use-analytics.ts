import { fetcher } from "@dub/utils";
import useSWR from "swr";

export const useAnalytics = () => {
  const { error, data, isLoading } = useSWR(`/api/analytics/client`, fetcher);

  return {
    analytics: data,
    error,
    isLoading,
  };
};

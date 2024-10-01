import { fetcher } from "@dub/utils";
import useSWR from "swr";

export const useEvents = () => {
  const { error, data, isLoading } = useSWR(`/api/events/client`, fetcher);

  return {
    events: data,
    error,
    isLoading,
  };
};

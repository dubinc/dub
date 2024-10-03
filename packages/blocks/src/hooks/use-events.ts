import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { useDub } from "../context";
import { EventType } from "../types";

interface UseEventsParams {
  event: EventType;
  interval: string;
  page: string;
}

export const useEvents = ({ event, interval, page }: UseEventsParams) => {
  const { publicToken } = useDub();

  const searchParams = new URLSearchParams({
    event,
    interval,
    page,
    publicToken,
  });

  const { error, data, isLoading } = useSWR<[]>(
    `/api/events/client?${searchParams.toString()}`,
    fetcher,
  );

  return {
    events: data,
    error,
    isLoading,
  };
};

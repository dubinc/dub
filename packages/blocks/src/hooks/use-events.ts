import { fetcher } from "@dub/utils";
import useSWR from "swr";

const EVENT_TYPES = ["clicks", "leads", "sales"] as const;

interface Props {
  event: (typeof EVENT_TYPES)[number];
  interval: string;
  page: string;
}

export const useEvents = ({ event, interval, page }: Props) => {
  const searchParams = new URLSearchParams();

  searchParams.set("event", event);
  searchParams.set("interval", interval);
  searchParams.set("page", page);

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

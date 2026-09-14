import { EventType } from "@prisma/client";

export function getCreateRewardEventFromQuery(
  searchParams: URLSearchParams,
): { event: EventType } | null {
  if (searchParams.get("default") !== "true") {
    return null;
  }

  const event = searchParams.get("event");

  return {
    event: event && event in EventType ? (event as EventType) : "sale",
  };
}

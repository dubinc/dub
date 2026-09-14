import { EventType } from "@prisma/client";

export function getCreateRewardEventFromQuery(
  searchParams: URLSearchParams,
): { event: EventType; isDefault: boolean } | null {
  const defaultParam = searchParams.get("default");

  if (defaultParam !== "true" && defaultParam !== "false") {
    return null;
  }

  const event = searchParams.get("event");

  return {
    event: event && event in EventType ? (event as EventType) : "sale",
    isDefault: defaultParam === "true",
  };
}

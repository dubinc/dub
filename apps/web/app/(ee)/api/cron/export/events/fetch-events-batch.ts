import { getEvents } from "@/lib/analytics/get-events";
import { EventsFilters } from "@/lib/analytics/types";

export async function* fetchEventsBatch(
  filters: Omit<EventsFilters, "page" | "limit">,
  pageSize: number = 1000,
) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const events = await getEvents({
      ...filters,
      page,
      limit: pageSize,
    });

    if (events.length > 0) {
      yield { events };
      page++;
      hasMore = events.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}

import { tb } from "@/lib/tinybird";
import { tbDemo } from "../tinybird/demo-client";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { clickEventMVSchemaTB } from "../zod/schemas/clicks";
import { INTERVAL_DATA } from "./constants";
import { EventsFilters } from "./types";

// Fetch data for /api/analytics/events
export const getEvents = async (params: EventsFilters) => {
  let { event, workspaceId, interval, start, end, isDemo } = params;

  if (start) {
    start = new Date(start);
    end = end ? new Date(end) : new Date(Date.now());

    // Swap start and end if start is greater than end
    if (start > end) {
      [start, end] = [end, start];
    }
  } else {
    interval = interval ?? "24h";
    start = INTERVAL_DATA[interval].startDate;
    end = new Date(Date.now());
  }

  // Create a Tinybird pipe
  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: `v1_events`,
    parameters: analyticsFilterTB,
    data: clickEventMVSchemaTB,
  });

  const response = await pipe({
    ...params,
    eventType: event,
    workspaceId,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
  });

  return response.data;
};

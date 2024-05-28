import { tb } from "@/lib/tinybird";
import { getDaysDifference } from "@dub/utils";
import { conn } from "../planetscale";
import { tbDemo } from "../tinybird/demo-client";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { clickAnalyticsResponse } from "../zod/schemas/clicks-analytics";
import { compositeAnalyticsResponse } from "../zod/schemas/composite-analytics";
import { leadAnalyticsResponse } from "../zod/schemas/leads-analytics";
import { saleAnalyticsResponse } from "../zod/schemas/sales-analytics";
import { INTERVAL_DATA } from "./constants";
import { AnalyticsFilters } from "./types";

const responseSchema = {
  clicks: clickAnalyticsResponse,
  leads: leadAnalyticsResponse,
  sales: saleAnalyticsResponse,
  composite: compositeAnalyticsResponse,
};

// Fetch data for /api/analytics
export const getAnalytics = async (params: AnalyticsFilters) => {
  let {
    event,
    groupBy,
    workspaceId,
    linkId,
    interval,
    start,
    end,
    timezone = "UTC",
    isDemo,
    isDeprecatedEndpoint = false,
  } = params;

  // get all-time clicks count if:
  // 1. type is count
  // 2. linkId is defined
  // 3. interval is all time
  // 4. call is made from dashboard
  if (linkId && groupBy === "count" && interval === "all_unfiltered") {
    const columns = event === "composite" ? `clicks, leads, sales` : `${event}`;

    let response = await conn.execute(
      `SELECT ${columns} FROM Link WHERE id = ?`,
      [linkId],
    );

    if (response.rows.length === 0 && event === "clicks") {
      response = await conn.execute(`SELECT clicks FROM Domain WHERE id = ?`, [
        linkId,
      ]);
    }

    return response.rows[0];
  }

  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start) {
    start = new Date(start);
    end = end ? new Date(end) : new Date(Date.now());

    const daysDifference = getDaysDifference(start, end);

    if (daysDifference <= 2) {
      granularity = "hour";
    } else if (daysDifference > 180) {
      granularity = "month";
    }

    // Swap start and end if start is greater than end
    if (start > end) {
      [start, end] = [end, start];
    }
  } else {
    interval = interval ?? "24h";
    start = INTERVAL_DATA[interval].startDate;
    end = new Date(Date.now());
    granularity = INTERVAL_DATA[interval].granularity;
  }

  // Create a Tinybird pipe
  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: `v1_${groupBy}`,
    parameters: analyticsFilterTB,
    data: responseSchema[event][groupBy],
  });

  const response = await pipe({
    ...params,
    eventType: event,
    workspaceId,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
    granularity,
    timezone,
  });

  // Return the count value for deprecated endpoints
  if (isDeprecatedEndpoint && groupBy === "count") {
    return response.data[0][event];
  }

  // Return the object for count endpoints
  if (groupBy === "count") {
    return response.data[0];
  }

  // Return array for other endpoints
  return response.data;
};

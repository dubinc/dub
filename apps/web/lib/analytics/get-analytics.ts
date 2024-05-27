import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { getDaysDifference } from "@dub/utils";
import { headers } from "next/headers";
import { conn } from "../planetscale";
import { tbDemo } from "../tinybird/demo-client";
import {
  analyticsFilterTB,
  analyticsQuerySchema,
} from "../zod/schemas/analytics";
import { clickAnalyticsResponse } from "../zod/schemas/clicks-analytics";
import { compositeAnalyticsResponse } from "../zod/schemas/composite-analytics";
import { leadAnalyticsResponse } from "../zod/schemas/leads-analytics";
import { saleAnalyticsResponse } from "../zod/schemas/sales-analytics";
import { INTERVAL_DATA } from "./constants";

export type AnalyticsFilters = z.infer<typeof analyticsQuerySchema> & {
  workspaceId?: string;
  isDemo?: boolean;
};

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
  } = params;

  // get all-time clicks count if:
  // 1. type is count
  // 2. linkId is defined
  // 3. interval is all time
  // 4. call is made from dashboard
  if (
    groupBy === "count" &&
    linkId &&
    interval === "all" &&
    headers()?.get("Request-Source") === "app.dub.co"
  ) {
    let response = await conn.execute(
      "SELECT clicks FROM Link WHERE `id` = ?",
      [linkId],
    );

    if (response.rows.length === 0) {
      response = await conn.execute(
        "SELECT clicks FROM Domain WHERE `id` = ?",
        [linkId],
      );
      if (response.rows.length === 0) {
        return 0;
      }
    }
    return response.rows[0]["clicks"];
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

  // for total clicks|leads, we return just the value;
  // everything else we return the full response
  if (groupBy === "count") {
    if (event === "clicks" || event === "leads") {
      return response.data[0][event];
    } else {
      return response.data[0];
    }
  }

  return response.data;
};

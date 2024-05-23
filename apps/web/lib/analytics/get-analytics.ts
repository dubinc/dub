import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { getDaysDifference } from "@dub/utils";
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
import { AnalyticsEndpoints } from "./types";

type AnalyticsEventType = "clicks" | "leads" | "sales" | "composite";

export type AnalyticsFilters = z.infer<typeof analyticsQuerySchema> & {
  endpoint?: AnalyticsEndpoints;
  workspaceId?: string;
  isDemo?: boolean;
};

const responseSchema = {
  clicks: clickAnalyticsResponse,
  leads: leadAnalyticsResponse,
  sales: saleAnalyticsResponse,
  composite: compositeAnalyticsResponse,
};

// Fetch data for `/api/analytics/(clicks|leads|sales)/[endpoint]`
export const getAnalytics = async (
  analyticsType: AnalyticsEventType,
  params: AnalyticsFilters,
) => {
  let {
    workspaceId,
    interval,
    start,
    end,
    isDemo,
    endpoint = "count",
  } = params;
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
    pipe: endpoint,
    parameters: analyticsFilterTB,
    data: responseSchema[analyticsType][endpoint],
  });

  const response = await pipe({
    ...params,
    eventType: analyticsType,
    workspaceId,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
    granularity,
  });

  // for total clicks|leads, we return just the value;
  // everything else we return the full response
  if (endpoint === "count") {
    if (["clicks", "leads"].includes(analyticsType)) {
      return response.data[0][analyticsType];
    } else {
      return response.data[0];
    }
  }

  return response.data;
};

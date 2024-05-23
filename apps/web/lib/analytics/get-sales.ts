import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { getDaysDifference } from "@dub/utils";
import { tbDemo } from "../tinybird/demo-client";
import { analyticsQuerySchema } from "../zod/schemas/analytics";
import { getClickAnalytics } from "../zod/schemas/clicks-analytics";
import { saleAnalyticsResponse } from "../zod/schemas/sales-analytics";
import { INTERVAL_DATA } from "./constants";
import { AnalyticsEndpoints } from "./types";

export const getSales = async (
  props: z.infer<typeof analyticsQuerySchema> & {
    workspaceId?: string;
    endpoint: AnalyticsEndpoints;
    isDemo?: boolean;
  },
) => {
  let { workspaceId, endpoint, interval, start, end } = props;

  // get all-time clicks count if:
  // 1. linkId is defined
  // 2. endpoint is not defined
  // 3. interval is all time
  // 4. call is made from dashboard
  // if (
  //   linkId &&
  //   endpoint === "count" &&
  //   interval === "all" &&
  //   headers()?.get("Request-Source") === "app.dub.co"
  // ) {
  //   let response = await conn.execute(
  //     "SELECT clicks FROM Link WHERE `id` = ?",
  //     [linkId],
  //   );

  //   if (response.rows.length === 0) {
  //     response = await conn.execute(
  //       "SELECT clicks FROM Domain WHERE `id` = ?",
  //       [linkId],
  //     );
  //     if (response.rows.length === 0) {
  //       return 0;
  //     }
  //   }
  //   return response.rows[0]["clicks"];
  // }

  const pipe = (props.isDemo ? tbDemo : tb).buildPipe({
    pipe: `sales_${endpoint}`,
    parameters: getClickAnalytics,
    data: saleAnalyticsResponse[endpoint],
  });

  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start) {
    start = new Date(start!);
    end = end ? new Date(end) : new Date(Date.now());

    const daysDifference = getDaysDifference(start, end);
    if (daysDifference <= 2) granularity = "hour";
    else if (daysDifference > 180) granularity = "month";

    // swap start and end if start is greater than end
    if (start > end) {
      [start, end] = [end, start];
    }
  } else {
    interval = interval ?? "24h";
    start = INTERVAL_DATA[interval].startDate;
    end = new Date(Date.now());
    granularity = INTERVAL_DATA[interval].granularity;
  }

  const response = await pipe({
    ...props,
    workspaceId,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
    granularity,
  });

  // for total sales, we return just the value;
  // everything else we return an array of values
  return endpoint === "count" ? response.data[0].sales : response.data;
};

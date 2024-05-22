import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { getDaysDifference } from "@dub/utils";
import {
  clickAnalyticsQuerySchema,
  getClickAnalytics,
} from "../zod/schemas/click-analytics";
import { leadAnalyticsResponse } from "../zod/schemas/lead-analytics";
import { INTERVAL_DATA } from "./constants";
import { AnalyticsEndpoints } from "./types";

export const getLeads = async (
  props: z.infer<typeof clickAnalyticsQuerySchema> & {
    workspaceId?: string;
    endpoint: AnalyticsEndpoints;
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

  const pipe = tb.buildPipe({
    pipe: `leads_${endpoint}`,
    parameters: getClickAnalytics,
    data: leadAnalyticsResponse[endpoint],
  });

  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (interval) {
    start = INTERVAL_DATA[interval].startDate;
    end = new Date(Date.now());
    granularity = INTERVAL_DATA[interval].granularity;
  } else {
    start = new Date(start!);
    end = end ? new Date(end) : new Date(Date.now());
    if (getDaysDifference(start, end) > 180) {
      granularity = "month";
    }

    // swap start and end if start is greater than end
    if (start > end) {
      [start, end] = [end, start];
    }
  }

  console.log("props", { ...props, start, end, workspaceId, granularity });

  const response = await pipe(
    getClickAnalytics.parse({
      ...props,
      workspaceId,
      // start: start.toISOString().replace("T", " ").replace("Z", ""),
      // end: end.toISOString().replace("T", " ").replace("Z", ""),
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    }),
  );

  // for total leads, we return just the value;
  // everything else we return an array of values
  return endpoint === "count" ? response.data[0].leads : response.data;
};

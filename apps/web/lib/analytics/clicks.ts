import { conn } from "@/lib/planetscale";
import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { getDaysDifference } from "@dub/utils";
import { intervalData } from ".";
import {
  clickAnalyticsQuerySchema,
  getClickAnalytics,
  getClickAnalyticsResponse,
} from "../zod/schemas";

export const getClicks = async (
  props: z.infer<typeof clickAnalyticsQuerySchema> & {
    workspaceId?: string;
  },
) => {
  let { workspaceId, groupBy, linkId, interval, start, end } = props;

  // get all-time clicks count if:
  // 1. linkId is defined
  // 2. groupBy is not defined
  // 3. interval is not defined
  if (linkId && !groupBy && !interval) {
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

  const pipe = tb.buildPipe({
    pipe: groupBy || "clicks",
    parameters: getClickAnalytics,
    data: getClickAnalyticsResponse[groupBy || "clicks"],
  });

  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (interval) {
    start = intervalData[interval].startDate;
    end = new Date(Date.now());
    granularity = intervalData[interval].granularity;
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

  const res = await pipe(
    getClickAnalytics.parse({
      ...props,
      workspaceId,
      start: start.toISOString().replace("T", " ").replace("Z", ""),
      end: end.toISOString().replace("T", " ").replace("Z", ""),
      granularity,
    }),
  );

  // for total clicks (groupBy undefined), we return just the value;
  // everything else we return an array of values
  return groupBy ? res.data : res.data[0];
};

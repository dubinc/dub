import { conn } from "@/lib/planetscale";
import { headers } from "next/headers";
import { AnalyticsFilters, getAnalytics } from "./get-analytics";

export const getClicks = async (filters: AnalyticsFilters) => {
  let { endpoint, linkId, interval } = filters;

  // get all-time clicks count if:
  // 1. linkId is defined
  // 2. endpoint is not defined
  // 3. interval is all time
  // 4. call is made from dashboard
  if (
    linkId &&
    endpoint === "count" &&
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

  return getAnalytics("clicks", filters);
};

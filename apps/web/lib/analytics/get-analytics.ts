import { getDaysDifference } from "@dub/utils";
import { DATABASE_URL, conn } from "../planetscale";
import z from "../zod";
import { getAnalyticsQuerySchema } from "../zod/schemas/analytics";
import {
  VALID_ANALYTICS_FILTERS,
  VALID_TINYBIRD_ENDPOINTS,
  intervalData,
} from "./constants";

export const getAnalytics = async ({
  workspaceId,
  linkId,
  domain,
  endpoint,
  interval,
  start,
  end,
  ...rest
}: z.infer<typeof getAnalyticsQuerySchema> & {
  workspaceId?: string;
  linkId?: string;
  endpoint: (typeof VALID_TINYBIRD_ENDPOINTS)[number];
}) => {
  // Note: we're using decodeURIComponent in this function because that's how we store it in MySQL and Tinybird
  if (
    !DATABASE_URL ||
    !process.env.TINYBIRD_API_KEY ||
    !VALID_TINYBIRD_ENDPOINTS.includes(endpoint)
  ) {
    return [];
  }

  // get all-time clicks count if:
  // 1. endpoint is /clicks
  // 2. interval is not defined
  // 3. linkId is defined
  if (endpoint === "clicks" && !interval && linkId) {
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

  let url = new URL(
    `${process.env.TINYBIRD_API_URL}/v0/pipes/${endpoint}.json`,
  );
  if (workspaceId) {
    url.searchParams.append("projectId", workspaceId);
  }
  if (linkId) {
    url.searchParams.append("linkId", linkId);
  } else if (domain) {
    url.searchParams.append("domain", domain);
  }

  if (interval) {
    url.searchParams.append(
      "start",
      intervalData[interval].startDate
        .toISOString()
        .replace("T", " ")
        .replace("Z", ""),
    );
    url.searchParams.append(
      "end",
      new Date(Date.now()).toISOString().replace("T", " ").replace("Z", ""),
    );

    url.searchParams.append("granularity", intervalData[interval].granularity);
  } else if (start) {
    url.searchParams.append(
      "start",
      new Date(start).toISOString().replace("T", " ").replace("Z", ""),
    );
    if (!end) {
      end = new Date(Date.now());
    }

    url.searchParams.append(
      "end",
      new Date(end).toISOString().replace("T", " ").replace("Z", ""),
    );

    url.searchParams.append(
      "granularity",
      getDaysDifference(start, end) > 180 ? "month" : "day",
    );
  }

  VALID_ANALYTICS_FILTERS.forEach((filter) => {
    if (rest[filter] !== undefined) {
      url.searchParams.append(filter, rest[filter]);
    }
  });

  console.log(url.toString());

  return await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
    },
  })
    .then(async (res) => {
      if (res.ok) {
        return res.json();
      }
      const error = await res.text();
      console.error(error);
    })
    .then(({ data }) => {
      if (endpoint === "clicks") {
        try {
          const clicks = data[0]["count()"];
          return clicks || 0;
        } catch (e) {
          console.log(e);
        }
      }
      return data;
    });
};

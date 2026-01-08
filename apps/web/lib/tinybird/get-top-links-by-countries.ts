import * as z from "zod/v4";
import { formatUTCDateTimeClickhouse } from "../analytics/utils/format-utc-datetime-clickhouse";
import { getStartEndDates } from "../analytics/utils/get-start-end-dates";
import { tb } from "./client";

const inputSchema = z.object({
  linkIds: z.array(z.string()),
  start: z.string(),
  end: z.string(),
});

const responseSchema = z.object({
  link_id: z.string(),
  country: z.string(),
  clicks: z.number().default(0),
});

const getTopLinksByCountriesTB = tb.buildPipe({
  pipe: "v3_group_by_link_country",
  parameters: inputSchema,
  data: responseSchema,
});

export async function getTopLinksByCountries({
  linkIds,
  start,
  end,
}: {
  linkIds: string[];
  start: Date;
  end: Date;
}) {
  const { startDate, endDate } = getStartEndDates({
    start,
    end,
    timezone: "UTC",
  });

  const response = await getTopLinksByCountriesTB({
    linkIds,
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
  });

  return response.data;
}

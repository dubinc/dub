import { formatUTCDateTimeClickhouse } from "../analytics/utils/format-utc-datetime-clickhouse";
import { getStartEndDates } from "../analytics/utils/get-start-end-dates";
import z from "../zod";
import { parseDateSchema } from "../zod/schemas/utils";
import { tb } from "./client";

const inputSchema = z.object({
  linkIds: z.array(z.string()),
  start: parseDateSchema,
  end: parseDateSchema,
});

const responseSchema = z.object({
  link_id: z.string(),
  country: z.string(),
  clicks: z.number().default(0),
});

const getClicksByCountriesTB = tb.buildPipe({
  pipe: "v3_clicks_by_countries",
  parameters: inputSchema,
  data: responseSchema,
});

export async function getClicksByCountries({
  linkIds,
  start,
  end,
}: z.infer<typeof inputSchema>) {
  const { startDate, endDate } = getStartEndDates({
    start,
    end,
    timezone: "UTC",
  });

  const response = await getClicksByCountriesTB({
    linkIds,
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
  });

  return response.data;
}

import z from "../zod";
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

export const getClicksByCountriesTB = tb.buildPipe({
  pipe: "v3_clicks_by_countries",
  parameters: inputSchema,
  data: z.array(responseSchema),
});

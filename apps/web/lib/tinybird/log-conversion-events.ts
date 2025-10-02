import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { tb, tbNew } from "./client";

const schema = z.object({
  workspace_id: z.string(),
  link_id: z.string().default(""),
  path: z.string(),
  body: z.string().default(""),
  error: z.string().default(""),
});

// Log the conversion events for debugging purposes
export const logConversionEventTB = tb.buildIngestEndpoint({
  datasource: "dub_conversion_events_log",
  event: schema,
});

// TODO: Remove after Tinybird migration
export const logConversionEventTBNew = tbNew.buildIngestEndpoint({
  datasource: "dub_conversion_events_log",
  event: schema,
});

export const logConversionEvent = async (payload: any) => {
  waitUntil(logConversionEventTBNew(payload));
  return await logConversionEventTB(payload);
};

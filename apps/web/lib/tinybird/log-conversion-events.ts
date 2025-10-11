import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { tb, tbOld } from "./client";

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
export const logConversionEventTBOld = tbOld.buildIngestEndpoint({
  datasource: "dub_conversion_events_log",
  event: schema,
});

export const logConversionEvent = async (payload: any) => {
  waitUntil(logConversionEventTBOld(payload));
  return await logConversionEventTB(payload);
};

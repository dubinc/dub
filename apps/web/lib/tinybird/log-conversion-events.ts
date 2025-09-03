import { z } from "zod";
import { tb } from "./client";

const schema = z.object({
  workspace_id: z.string(),
  link_id: z.string().default(""),
  path: z.string(),
  body: z.string().default(""),
  error: z.string().default(""),
});

// Log the conversion events for debugging purposes
export const logConversionEvent = tb.buildIngestEndpoint({
  datasource: "dub_conversion_events_log",
  event: schema,
});

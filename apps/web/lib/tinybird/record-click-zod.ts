import { z } from "zod";
import { tb } from "./client";

export const recordClickZodSchema = z.object({
  timestamp: z.string().default(""),
  identity_hash: z.string().default(""),
  click_id: z.string().default(""),
  link_id: z.string().default(""),
  url: z.string().default(""),
  ip: z.string().default(""),
  continent: z.string().default(""),
  country: z.string().default("Unknown"),
  region: z.string().default("Unknown"),
  city: z.string().default("Unknown"),
  latitude: z.string().default("Unknown"),
  longitude: z.string().default("Unknown"),
  vercel_region: z.string().default(""),
  device: z.string().default("Desktop"),
  device_vendor: z.string().default("Unknown"),
  device_model: z.string().default("Unknown"),
  browser: z.string().default("Unknown"),
  browser_version: z.string().default("Unknown"),
  engine: z.string().default("Unknown"),
  engine_version: z.string().default("Unknown"),
  os: z.string().default("Unknown"),
  os_version: z.string().default("Unknown"),
  cpu_architecture: z.string().default("Unknown"),
  ua: z.string().default("Unknown"),
  bot: z.number().default(0),
  qr: z.number().default(0),
  referer: z.string().default("(direct)"),
  referer_url: z.string().default("(direct)"),
  trigger: z.string().default("link"),
});

export const recordClickZod = tb.buildIngestEndpoint({
  datasource: "dub_click_events",
  event: recordClickZodSchema,
  wait: true,
});

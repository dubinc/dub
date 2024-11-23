import z from "@/lib/zod";
import { commonDeprecatedEventFields } from "./deprecated";
import { linkEventSchema } from "./links";

export const clickEventSchemaTB = z.object({
  timestamp: z.string(),
  click_id: z.string(),
  link_id: z.string(),
  url: z.string(),
  continent: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  device: z.string().nullable(),
  device_model: z.string().nullable(),
  device_vendor: z.string().nullable(),
  browser: z.string().nullable(),
  browser_version: z.string().nullable(),
  os: z.string().nullable(),
  os_version: z.string().nullable(),
  engine: z.string().nullable(),
  engine_version: z.string().nullable(),
  cpu_architecture: z.string().nullable(),
  ua: z.string().nullable(),
  bot: z.number().nullable(),
  referer: z.string().nullable(),
  referer_url: z.string().nullable(),
  ip: z.string().nullable(),
  qr: z.number().nullable(),
});

export const clickEventSchemaTBEndpoint = z.object({
  event: z.literal("click"),
  timestamp: z.string(),
  click_id: z.string(),
  link_id: z.string(),
  url: z.string(),
  continent: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  device: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  referer: z.string().nullable(),
  referer_url: z.string().nullable(),
  referer_url_processed: z.string().nullable(),
  ip: z.string().nullable(),
  qr: z.number().nullable(),
});

export const clickEventSchema = z.object({
  id: z.string(),
  url: z.string(),
  continent: z.string(),
  country: z.string(),
  city: z.string(),
  device: z.string(),
  browser: z.string(),
  os: z.string(),
  referer: z.string(),
  refererUrl: z.string(),
  qr: z.coerce.boolean(),
  ip: z.string(),
});

export const clickEventResponseSchema = z
  .object({
    event: z.literal("click"),
    timestamp: z.coerce.string(),
    click: clickEventSchema,
    link: linkEventSchema,
  })
  .merge(commonDeprecatedEventFields)
  .openapi({ ref: "ClickEvent" });

import z from "@/lib/zod";
import { LinkSchema } from "../zod/schemas/links";
import { WEBHOOK_TRIGGERS } from "./constants";

export const linkEventSchema = LinkSchema;

export const clickEventSchema = z.object({
  clickId: z.string(),
  aliasLinkId: z.string(),
  url: z.string(),
  ip: z.string(),
  continent: z.string(),
  country: z.string(),
  city: z.string(),
  region: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  device: z.string(),
  deviceVendor: z.string(),
  deviceModel: z.string(),
  browser: z.string(),
  browserVersion: z.string(),
  engine: z.string(),
  engineVersion: z.string(),
  os: z.string(),
  osVersion: z.string(),
  cpuArchitecture: z.string(),
  ua: z.string(),
  bot: z.boolean(),
  qr: z.boolean(),
  referer: z.string(),
  refererUrl: z.string(),
  timestamp: z.string(),
  identityHash: z.string(),
  link: LinkSchema,
});

export const leadEventSchema = z.object({
  eventName: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerAvatar: z.string().nullable(),
  click: clickEventSchema.partial(),
  link: LinkSchema,
});

export const saleEventSchema = z.object({
  eventName: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerAvatar: z.string().nullable(),
  amount: z.number(),
  paymentProcessor: z.string(),
  invoiceId: z.string().nullable(),
  currency: z.string(),
  click: clickEventSchema.partial(),
  link: LinkSchema,
});

// Schema of the payload sent to the webhook endpoint by Dub
export const webhookPayloadSchema = z.object({
  id: z.string().describe("Unique identifier for the event."),
  event: z
    .enum(WEBHOOK_TRIGGERS)
    .describe("The type of event that triggered the webhook."),
  createdAt: z
    .string()
    .describe("The date and time when the event was created in UTC."),
  data: z.union([
    linkEventSchema,
    clickEventSchema,
    leadEventSchema,
    saleEventSchema,
  ]),
});

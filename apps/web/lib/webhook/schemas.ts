import z from "@/lib/zod";
import { LinkSchema } from "../zod/schemas/links";
import { WEBHOOK_TRIGGERS } from "./constants";

export const linkEventSchema = LinkSchema.omit({
  tags: true,
  tagId: true,
  projectId: true,
});

export const clickEventSchema = z.object({
  timestamp: z.string(),
  clickId: z.string(),
  // aliasLinkId: z.string(),
  url: z.string(),
  ip: z.string(),
  continent: z.string(),
  country: z.string(),
  city: z.string(),
  // region: z.string(),
  // latitude: z.string(),
  // longitude: z.string(),
  device: z.string(),
  // deviceVendor: z.string(),
  // deviceModel: z.string(),
  browser: z.string(),
  // browserVersion: z.string(),
  // engine: z.string(),
  // engineVersion: z.string(),
  os: z.string(),
  // osVersion: z.string(),
  // cpuArchitecture: z.string(),
  ua: z.string(),
  bot: z.boolean(),
  qr: z.boolean(),
  referer: z.string(),
  // refererUrl: z.string(),
  // identityHash: z.string(),
  link: linkEventSchema,
});

const customerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
});

export const leadEventSchema = z.object({
  eventName: z.string(),
  customer: customerSchema,
  click: clickEventSchema.omit({ link: true, timestamp: true }),
  link: linkEventSchema,
});

const saleSchema = z.object({
  amount: z.number(),
  paymentProcessor: z.string(),
  invoiceId: z.string().nullable(),
  currency: z.string(),
});

export const saleEventSchema = z.object({
  eventName: z.string(),
  customer: customerSchema,
  sale: saleSchema,
  click: clickEventSchema.omit({ link: true, timestamp: true }),
  link: linkEventSchema,
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
  data: z.any().describe("The data associated with the event."),
});

import z from "@/lib/zod";
import { LinkSchema } from "../zod/schemas/links";

export const linkEventSchema = LinkSchema.extend({
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const clickEventSchema = z.object({
  id: z.string(),
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
  link: z.object({ id: z.string() }),
});

export const leadEventSchema = z.object({
  eventName: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerAvatar: z.string().nullable(),
  click: clickEventSchema.partial(),
  link: z.object({
    id: z.string(),
    externalId: z.string().nullable(),
    domain: z.string(),
    key: z.string(),
  }),
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
  link: z.object({ id: z.string() }),
});

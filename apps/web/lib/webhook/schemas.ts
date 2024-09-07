import z from "@/lib/zod";
import { clickEventSchema } from "../zod/schemas/clicks";
import { linkEventSchema } from "../zod/schemas/links";
import { WEBHOOK_TRIGGERS } from "./constants";

const customerSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
});

const saleSchema = z.object({
  amount: z.number(),
  paymentProcessor: z.string(),
  invoiceId: z.string().nullable(),
});

export const leadEventSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  timestamp: z.date(),
  customer: customerSchema,
  click: clickEventSchema,
  link: linkEventSchema,
});

export const saleEventSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  timestamp: z.date(),
  click: clickEventSchema,
  link: linkEventSchema,
  customer: customerSchema,
  sale: saleSchema,
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

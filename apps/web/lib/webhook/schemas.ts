import z from "@/lib/zod";
import { clickEventSchema } from "../zod/schemas/clicks";
import { linkEventSchema } from "../zod/schemas/links";
import { WEBHOOK_TRIGGERS } from "./constants";

const CustomerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
});

const saleSchema = z.object({
  amount: z.number(),
  currency: z.string(),
  paymentProcessor: z.string(),
  invoiceId: z.string().nullable(),
});

export const clickWebhookEventSchema = z.object({
  click: clickEventSchema,
  link: linkEventSchema,
});

export const leadWebhookEventSchema = z.object({
  eventName: z.string(),
  customer: CustomerSchema,
  click: clickEventSchema,
  link: linkEventSchema,
});

export const saleWebhookEventSchema = z.object({
  eventName: z.string(),
  customer: CustomerSchema,
  click: clickEventSchema,
  link: linkEventSchema,
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

export const webhookEventSchema = z
  .union([
    z.object({
      id: z.string(),
      event: z.union([
        z.literal("link.created"),
        z.literal("link.updated"),
        z.literal("link.deleted"),
      ]),
      createdAt: z.string(),
      data: linkEventSchema,
    }),

    z.object({
      id: z.string(),
      event: z.literal("link.clicked"),
      createdAt: z.string(),
      data: clickWebhookEventSchema,
    }),

    z.object({
      id: z.string(),
      event: z.literal("lead.created"),
      createdAt: z.string(),
      data: leadWebhookEventSchema,
    }),

    z.object({
      id: z.string(),
      event: z.literal("sale.created"),
      createdAt: z.string(),
      data: saleWebhookEventSchema,
    }),
  ])
  .openapi({
    ref: "WebhookEvent",
    description: "Webhook event schema",
    "x-speakeasy-include": true,
  });

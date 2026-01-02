import z from "zod";
import { clickEventSchema } from "../zod/schemas/clicks";
import { CommissionWebhookSchema } from "../zod/schemas/commissions";
import { CustomerSchema } from "../zod/schemas/customers";
import { linkEventSchema } from "../zod/schemas/links";
import {
  EnrolledPartnerSchema,
  WebhookPartnerSchema,
} from "../zod/schemas/partners";
import { partnerApplicationWebhookSchema } from "../zod/schemas/program-application";
import { WEBHOOK_TRIGGERS } from "./constants";

const webhookSaleSchema = z.object({
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
  partner: WebhookPartnerSchema.nullish(),
  metadata: z.record(z.string(), z.any()).nullable().default(null),
});

export const saleWebhookEventSchema = z.object({
  eventName: z.string(),
  customer: CustomerSchema,
  click: clickEventSchema,
  link: linkEventSchema,
  sale: webhookSaleSchema,
  partner: WebhookPartnerSchema.nullish(),
  metadata: z.record(z.string(), z.any()).nullable().default(null),
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

// Exported for the OpenAPI spec
export const webhookEventSchema = z
  .union([
    z
      .object({
        id: z.string(),
        event: z.union([
          z.literal("link.created"),
          z.literal("link.updated"),
          z.literal("link.deleted"),
        ]),
        createdAt: z.string(),
        data: linkEventSchema,
      })
      .meta({
        ref: "LinkWebhookEvent",
        description: "Triggered when a link is created, updated, or deleted.",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("link.clicked"),
        createdAt: z.string(),
        data: clickWebhookEventSchema,
      })
      .meta({
        ref: "LinkClickedEvent",
        description: "Triggered when a link is clicked.",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("lead.created"),
        createdAt: z.string(),
        data: leadWebhookEventSchema,
      })
      .meta({
        ref: "LeadCreatedEvent",
        description: "Triggered when a lead is created.",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("sale.created"),
        createdAt: z.string(),
        data: saleWebhookEventSchema,
      })
      .meta({
        ref: "SaleCreatedEvent",
        description: "Triggered when a sale is created.",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("partner.enrolled"),
        createdAt: z.string(),
        data: EnrolledPartnerSchema,
      })
      .meta({
        ref: "PartnerEnrolledEvent",
        description: "Triggered when a partner is enrolled.",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("partner.application_submitted"),
        createdAt: z.string(),
        data: partnerApplicationWebhookSchema,
      })
      .meta({
        ref: "PartnerApplicationSubmittedEvent",
        description:
          "Triggered when a partner submits an application to join a program.",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("commission.created"),
        createdAt: z.string(),
        data: CommissionWebhookSchema,
      })
      .meta({
        ref: "CommissionCreatedEvent",
        description: "Triggered when a commission is created for a partner.",
      }),
  ])
  .meta({
    ref: "WebhookEvent",
    description: "Webhook event schema",
    "x-speakeasy-include": true,
  });

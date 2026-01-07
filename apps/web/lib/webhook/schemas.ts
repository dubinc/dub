import * as z from "zod/v4";
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
        description: "Triggered when a link is created, updated, or deleted.",
        id: "LinkWebhookEvent",
        outputId: "LinkWebhookEvent",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("link.clicked"),
        createdAt: z.string(),
        data: clickWebhookEventSchema,
      })
      .meta({
        description: "Triggered when a link is clicked.",
        id: "LinkClickedEvent",
        outputId: "LinkClickedEvent",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("lead.created"),
        createdAt: z.string(),
        data: leadWebhookEventSchema,
      })
      .meta({
        description: "Triggered when a lead is created.",
        id: "LeadCreatedEvent",
        outputId: "LeadCreatedEvent",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("sale.created"),
        createdAt: z.string(),
        data: saleWebhookEventSchema,
      })
      .meta({
        description: "Triggered when a sale is created.",
        id: "SaleCreatedEvent",
        outputId: "SaleCreatedEvent",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("partner.enrolled"),
        createdAt: z.string(),
        data: EnrolledPartnerSchema,
      })
      .meta({
        description: "Triggered when a partner is enrolled.",
        id: "PartnerEnrolledEvent",
        outputId: "PartnerEnrolledEvent",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("partner.application_submitted"),
        createdAt: z.string(),
        data: partnerApplicationWebhookSchema,
      })
      .meta({
        description:
          "Triggered when a partner submits an application to join a program.",
        id: "PartnerApplicationSubmittedEvent",
        outputId: "PartnerApplicationSubmittedEvent",
      }),

    z
      .object({
        id: z.string(),
        event: z.literal("commission.created"),
        createdAt: z.string(),
        data: CommissionWebhookSchema,
      })
      .meta({
        description: "Triggered when a commission is created for a partner.",
        id: "CommissionCreatedEvent",
        outputId: "CommissionCreatedEvent",
      }),
  ])
  .meta({
    description: "Webhook event schema",
    "x-speakeasy-include": true,
    id: "WebhookEvent",
  });

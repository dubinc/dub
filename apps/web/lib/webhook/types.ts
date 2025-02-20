import z from "../zod";
import { linkEventSchema } from "../zod/schemas/links";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";
import { WEBHOOK_TRIGGERS } from "./constants";
import {
  clickWebhookEventSchema,
  leadWebhookEventSchema,
  saleWebhookEventSchema,
} from "./schemas";

// TODO:
// Remove the duplicate types

export type LinkEventDataProps = z.infer<typeof linkEventSchema>;

export type ClickEventDataProps = z.infer<typeof clickWebhookEventSchema>;

export type LeadEventDataProps = z.infer<typeof leadWebhookEventSchema>;

export type SaleEventDataProps = z.infer<typeof saleWebhookEventSchema>;

export type PartnerEventDataProps = z.infer<typeof EnrolledPartnerSchema>;

export type EventDataProps =
  | LinkEventDataProps
  | ClickEventDataProps
  | LeadEventDataProps
  | SaleEventDataProps
  | PartnerEventDataProps;

export type WebhookTrigger = (typeof WEBHOOK_TRIGGERS)[number];

export type ClickEventWebhookData = z.infer<typeof clickWebhookEventSchema>;

export type LeadEventWebhookData = z.infer<typeof leadWebhookEventSchema>;

export type SaleEventWebhookData = z.infer<typeof saleWebhookEventSchema>;

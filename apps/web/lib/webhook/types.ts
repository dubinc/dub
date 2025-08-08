import z from "../zod";
import { CommissionEnrichedSchema } from "../zod/schemas/commissions";
import { linkEventSchema } from "../zod/schemas/links";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";
import { WEBHOOK_TRIGGERS } from "./constants";
import {
  clickWebhookEventSchema,
  leadWebhookEventSchema,
  saleWebhookEventSchema,
} from "./schemas";

export type WebhookTrigger = (typeof WEBHOOK_TRIGGERS)[number];

export type ClickEventWebhookPayload = z.infer<typeof clickWebhookEventSchema>;

export type LeadEventWebhookPayload = z.infer<typeof leadWebhookEventSchema>;

export type SaleEventWebhookPayload = z.infer<typeof saleWebhookEventSchema>;

export type PartnerEventWebhookPayload = z.infer<typeof EnrolledPartnerSchema>;

export type CommissionEventWebhookPayload = z.infer<
  typeof CommissionEnrichedSchema
>;

export type WebhookEventPayload =
  | z.infer<typeof linkEventSchema>
  | ClickEventWebhookPayload
  | LeadEventWebhookPayload
  | SaleEventWebhookPayload
  | PartnerEventWebhookPayload
  | CommissionEventWebhookPayload;

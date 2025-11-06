import z from "../zod";
import { BountySchema } from "../zod/schemas/bounties";
import { CommissionWebhookSchema } from "../zod/schemas/commissions";
import { linkEventSchema } from "../zod/schemas/links";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";
import { payoutWebhookEventSchema } from "../zod/schemas/payouts";
import {
  clickWebhookEventSchema,
  leadWebhookEventSchema,
  saleWebhookEventSchema,
} from "./schemas";

export type ClickEventWebhookPayload = z.infer<typeof clickWebhookEventSchema>;

export type LeadEventWebhookPayload = z.infer<typeof leadWebhookEventSchema>;

export type SaleEventWebhookPayload = z.infer<typeof saleWebhookEventSchema>;

export type PartnerEventWebhookPayload = z.infer<typeof EnrolledPartnerSchema>;

export type CommissionEventWebhookPayload = z.infer<
  typeof CommissionWebhookSchema
>;

export type BountyEventWebhookPayload = z.infer<typeof BountySchema>;

export type PayoutEventWebhookPayload = z.infer<
  typeof payoutWebhookEventSchema
>;

export type WebhookEventPayload =
  | z.infer<typeof linkEventSchema>
  | ClickEventWebhookPayload
  | LeadEventWebhookPayload
  | SaleEventWebhookPayload
  | PartnerEventWebhookPayload
  | CommissionEventWebhookPayload
  | BountyEventWebhookPayload
  | PayoutEventWebhookPayload;

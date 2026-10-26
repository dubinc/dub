import * as z from "zod/v4";
import { linkEventSchema } from "../zod/schemas/links";
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

export type WebhookEventPayload =
  | z.infer<typeof linkEventSchema>
  | ClickEventWebhookPayload
  | LeadEventWebhookPayload
  | SaleEventWebhookPayload;

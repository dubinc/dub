import z from "../zod";
import { clickEventSchema } from "../zod/schemas/clicks";
import { linkEventSchema } from "../zod/schemas/links";
import { leadWebhookEventSchema, saleWebhookEventSchema } from "./schemas";

export type LinkEventDataProps = z.infer<typeof linkEventSchema>;

export type ClickEventDataProps = z.infer<typeof clickEventSchema>;

export type LeadEventDataProps = z.infer<typeof leadWebhookEventSchema>;

export type SaleEventDataProps = z.infer<typeof saleWebhookEventSchema>;

export type EventDataProps =
  | LinkEventDataProps
  | ClickEventDataProps
  | LeadEventDataProps
  | SaleEventDataProps;

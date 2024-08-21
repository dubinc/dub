import { WebhookTrigger } from "../types";

export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_SECRET_PREFIX = `whsec_`;

export const WEBHOOK_TRIGGER_DESCRIPTIONS = {
  "link.created": "Link created",
  "link.updated": "Link updated",
  "link.deleted": "Link deleted",
  "link.clicked": "Link clicked",
  "lead.created": "Lead created",
  "sale.created": "Sale created",
} as const;

export const WEBHOOK_TRIGGERS = Object.keys(
  WEBHOOK_TRIGGER_DESCRIPTIONS,
) as WebhookTrigger[];

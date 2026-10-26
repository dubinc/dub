import type { WebhookTrigger } from "./types";

export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_ID_PREFIX = "wh_";

export const WEBHOOK_SECRET_PREFIX = "whsec_";

export const WEBHOOK_EVENT_ID_PREFIX = "evt_";

export const LINK_CLICK_WEBHOOK_TRIGGER = "link.clicked" as const;

export const WEBHOOK_TRIGGERS = [
  "link.created",
  "link.updated",
  "link.deleted",
  "link.clicked",
  "lead.created",
  "sale.created",
] as const;

export const WEBHOOK_TRIGGER_DESCRIPTIONS: Record<WebhookTrigger, string> = {
  "link.created": "Occurs whenever a link is created",
  "link.updated": "Occurs whenever a link is updated",
  "link.deleted": "Occurs whenever a link is deleted",
  "link.clicked": "Occurs whenever a link is clicked",
  "lead.created": "Occurs whenever a lead is created",
  "sale.created": "Occurs whenever a sale is created",
} as const;

export const WEBHOOK_FAILURE_NOTIFY_THRESHOLDS = [5, 10, 15] as const;
export const WEBHOOK_FAILURE_DISABLE_THRESHOLD = 20 as const;

export const MAX_WEBHOOK_FOLDERS = 100 as const;

import type { WebhookTrigger } from "./types";

export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_ID_PREFIX = "wh_";

export const WEBHOOK_SECRET_PREFIX = "whsec_";

export const WEBHOOK_EVENT_ID_PREFIX = "evt_";

export const LINK_CLICK_WEBHOOK_TRIGGER = "link.clicked" as const;

export const WORKSPACE_LEVEL_WEBHOOK_TRIGGERS = [
  "link.created",
  "link.updated",
  "link.deleted",
  "link.clicked",
  "lead.created",
  "sale.created",
] as const;

export const PROGRAM_LEVEL_WEBHOOK_TRIGGERS = [
  "partner.application_submitted",
  "partner.enrolled",
  "partner.merged",
  "commission.created",
  "bounty.created",
  "bounty.updated",
  "payout.confirmed",
  "discount_code.created",
  "discount_code.deleted",
] as const;

export const WEBHOOK_TRIGGERS = [
  ...WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
  ...PROGRAM_LEVEL_WEBHOOK_TRIGGERS,
] as const;

export const WEBHOOK_TRIGGER_DESCRIPTIONS: Record<WebhookTrigger, string> = {
  "link.created": "Occurs whenever a link is created",
  "link.updated": "Occurs whenever a link is updated",
  "link.deleted": "Occurs whenever a link is deleted",
  "link.clicked": "Occurs whenever a link is clicked",
  "lead.created": "Occurs whenever a lead is created",
  "sale.created": "Occurs whenever a sale is created",
  "partner.application_submitted":
    "Occurs whenever a partner submits an application to your program",
  "partner.enrolled":
    "Occurs whenever a partner is enrolled in your program (either their application was approved, they accepted your invite, or via the API)",
  "partner.merged": "Occurs when two partner accounts are merged",
  "commission.created":
    "Occurs whenever a commission is created for a partner (clawbacks will also trigger this event with a negative amount)",
  "bounty.created": "Occurs whenever a bounty is created in your program",
  "bounty.updated": "Occurs whenever a bounty in your program is updated",
  "payout.confirmed": "Occurs whenever a payout in your program is confirmed",
  "discount_code.created":
    "Occurs whenever a discount code is created for a partner",
  "discount_code.deleted":
    "Occurs whenever a discount code for a partner is deleted",
} as const;

export const WEBHOOK_FAILURE_NOTIFY_THRESHOLDS = [5, 10, 15] as const;
export const WEBHOOK_FAILURE_DISABLE_THRESHOLD = 20 as const;

export const MAX_WEBHOOK_FOLDERS = 100 as const;

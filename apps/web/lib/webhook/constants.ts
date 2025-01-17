export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_ID_PREFIX = "wh_";

export const WEBHOOK_SECRET_PREFIX = "whsec_";

export const WEBHOOK_EVENT_ID_PREFIX = "evt_";

export const WEBHOOK_REDIS_KEY = "dub:webhooks";

export const WEBHOOK_TRIGGERS = [
  "link.created",
  "link.updated",
  "link.deleted",
  "link.clicked",
  "lead.created",
  "sale.created",
] as const;

export const WEBHOOK_TRIGGER_DESCRIPTIONS = {
  "link.created": "Link created",
  "link.updated": "Link updated",
  "link.deleted": "Link deleted",
  "link.clicked": "Link clicked",
  "lead.created": "Lead created",
  "sale.created": "Sale created",
} as const;

export const WEBHOOK_FAILURE_NOTIFY_THRESHOLDS = [5, 10, 15] as const;

export const WEBHOOK_FAILURE_DISABLE_THRESHOLD = 20 as const;

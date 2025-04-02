export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_ID_PREFIX = "wh_";

export const WEBHOOK_SECRET_PREFIX = "whsec_";

export const WEBHOOK_EVENT_ID_PREFIX = "evt_";

export const WEBHOOK_REDIS_KEY = "dub:webhooks";

export const WORKSPACE_LEVEL_WEBHOOK_TRIGGERS = [
  "link.created",
  "link.updated",
  "link.deleted",
  "lead.created",
  "sale.created",
  "partner.created",
] as const;

export const LINK_LEVEL_WEBHOOK_TRIGGERS = ["link.clicked"] as const;

export const WEBHOOK_TRIGGERS = [
  ...WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
  ...LINK_LEVEL_WEBHOOK_TRIGGERS,
] as const;

export const WEBHOOK_TRIGGER_DESCRIPTIONS = {
  "link.created": "Link created",
  "link.updated": "Link updated",
  "link.deleted": "Link deleted",
  "link.clicked": "Link clicked",
  "lead.created": "Lead created",
  "sale.created": "Sale created",
  "partner.created": "Partner created",
} as const;

export const WEBHOOK_FAILURE_NOTIFY_THRESHOLDS = [5, 10, 15] as const;
export const WEBHOOK_FAILURE_DISABLE_THRESHOLD = 20 as const;

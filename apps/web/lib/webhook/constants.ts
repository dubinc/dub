export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_SECRET_PREFIX = "whsec_";

export const WEBHOOK_EVENT_ID_PREFIX = "event_";

export const WORKSPACE_LEVEL_WEBHOOK_TRIGGERS = [
  "link.created",
  "link.updated",
  "link.deleted",
] as const;

export const LINK_LEVEL_WEBHOOK_TRIGGERS = [
  "link.clicked",
  "lead.created",
  "sale.created",
] as const;

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
} as const;

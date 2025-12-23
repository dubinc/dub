export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_ID_PREFIX = "wh_";

export const WEBHOOK_SECRET_PREFIX = "whsec_";

export const WEBHOOK_EVENT_ID_PREFIX = "evt_";

export const WORKSPACE_LEVEL_WEBHOOK_TRIGGERS = [
  "link.created",
  "link.updated",
  "link.deleted",
  "lead.created",
  "sale.created",
] as const;

export const PROGRAM_LEVEL_WEBHOOK_TRIGGERS = [
  "partner.application_submitted",
  "partner.enrolled",
  "commission.created",
  "bounty.created",
  "bounty.updated",
  "payout.confirmed",
] as const;

export const LINK_LEVEL_WEBHOOK_TRIGGERS = ["link.clicked"] as const;

export const WEBHOOK_TRIGGERS = [
  ...WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
  ...PROGRAM_LEVEL_WEBHOOK_TRIGGERS,
  ...LINK_LEVEL_WEBHOOK_TRIGGERS,
] as const;

export const WEBHOOK_TRIGGER_DESCRIPTIONS: Record<
  (typeof WEBHOOK_TRIGGERS)[number],
  string
> = {
  "link.created": "Link created",
  "link.updated": "Link updated",
  "link.deleted": "Link deleted",
  "link.clicked": "Link clicked",
  "lead.created": "Lead created",
  "sale.created": "Sale created",
  "partner.application_submitted": "Partner application submitted",
  "partner.enrolled": "Partner enrolled",
  "commission.created": "Commission created",
  "bounty.created": "Bounty created",
  "bounty.updated": "Bounty updated",
  "payout.confirmed": "Payout confirmed",
} as const;

export const WEBHOOK_FAILURE_NOTIFY_THRESHOLDS = [5, 10, 15] as const;
export const WEBHOOK_FAILURE_DISABLE_THRESHOLD = 20 as const;

export const POSTBACK_SECRET_LENGTH = 16;

export const POSTBACK_SECRET_PREFIX = "pbsec_";

export const POSTBACK_EVENT_ID_PREFIX = "evt_";

export const POSTBACK_TRIGGERS = [
  "lead.created",
  "sale.created",
  "commission.created",
] as const;

export const POSTBACK_TRIGGER_DESCRIPTIONS: Record<string, string> = {
  "lead.created": "Lead created",
  "sale.created": "Sale created",
  "commission.created": "Commission created",
};

export const MAX_POSTBACKS = 5;

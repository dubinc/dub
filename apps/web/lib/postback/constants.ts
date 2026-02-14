export const POSTBACK_SECRET_LENGTH = 16;

export const POSTBACK_SECRET_PREFIX = "pbsec_";

export const POSTBACK_TRIGGERS = [
  "lead.created",
  "sale.created",
  "commission.created",
] as const;

export const POSTBACK_TRIGGER_DESCRIPTIONS: Record<PostbackTrigger, string> = {
  "lead.created": "Lead created",
  "sale.created": "Sale created",
  "commission.created": "Commission created",
};

export type PostbackTrigger = (typeof POSTBACK_TRIGGERS)[number];

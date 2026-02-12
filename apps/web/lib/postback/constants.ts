export const POSTBACK_SECRET_LENGTH = 16;
export const POSTBACK_SECRET_PREFIX = "pbsec_";

export const PARTNER_POSTBACK_TRIGGERS = [
  "lead.created",
  "sale.created",
  "commission.created",
] as const;

export type PartnerPostbackTrigger = (typeof PARTNER_POSTBACK_TRIGGERS)[number];

export const PARTNER_POSTBACK_TRIGGER_DESCRIPTIONS: Record<
  PartnerPostbackTrigger,
  string
> = {
  "lead.created": "Lead created",
  "sale.created": "Sale created",
  "commission.created": "Commission created",
};

export const PARTNER_PAYOUT_METHODS = [
  "us_bank_account",
  "acss_debit",
  "sepa_debit",
] as const;

export type PARTNER_PAYOUT_METHOD = (typeof PARTNER_PAYOUT_METHODS)[number];

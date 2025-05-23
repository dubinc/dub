import Stripe from "stripe";
import { PAYOUT_FEES } from "./partners/constants";

export const PARTNER_PAYOUT_METHODS = [
  "us_bank_account",
  "acss_debit",
  "sepa_debit",
] as const;

export type PARTNER_PAYOUT_METHOD = (typeof PARTNER_PAYOUT_METHODS)[number];

export const calculatePayoutFee = (
  paymentMethod: Stripe.PaymentMethod.Type,
  plan: string | undefined,
) => {
  if (!paymentMethod) {
    return null;
  }

  const planType = plan?.split(" ")[0] ?? "business";

  if (["link", "card"].includes(paymentMethod)) {
    return PAYOUT_FEES[planType].card;
  }

  if (["us_bank_account", "acss_debit", "sepa_debit"].includes(paymentMethod)) {
    return PAYOUT_FEES[planType].ach;
  }
};

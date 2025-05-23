import Stripe from "stripe";
import { DIRECT_DEBIT_PAYMENT_METHODS, PAYOUT_FEES } from "./partners/constants";

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


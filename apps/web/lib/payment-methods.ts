import Stripe from "stripe";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  PAYOUT_FEES,
} from "./partners/constants";

export const calculatePayoutFee = ({
  paymentMethod,
  plan,
}: {
  paymentMethod: Stripe.PaymentMethod.Type;
  plan: string | undefined;
}) => {
  if (!paymentMethod) {
    return null;
  }

  const planType = plan?.split(" ")[0] ?? "business";

  if (["link", "card"].includes(paymentMethod)) {
    return PAYOUT_FEES[planType].card;
  }

  if (DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(paymentMethod)) {
    return PAYOUT_FEES[planType].direct_debit;
  }
};

import Stripe from "stripe";
import { DIRECT_DEBIT_PAYMENT_METHOD_TYPES } from "./partners/constants";

export const calculatePayoutFeeForMethod = ({
  paymentMethod,
  payoutFee,
}: {
  paymentMethod: Stripe.PaymentMethod.Type;
  payoutFee: number | undefined;
}) => {
  if (!paymentMethod || payoutFee === undefined || payoutFee === null) {
    return null;
  }

  if (["link", "card"].includes(paymentMethod)) {
    return payoutFee + 0.03;
  }

  if (DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(paymentMethod)) {
    return payoutFee;
  }

  throw new Error(`Unsupported payment method ${paymentMethod}.`);
};

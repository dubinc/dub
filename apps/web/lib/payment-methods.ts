import Stripe from "stripe";
import { DIRECT_DEBIT_PAYMENT_METHOD_TYPES } from "./partners/constants";

export const computePayoutFeeForMethod = ({
  paymentMethod,
  payoutFee,
}: {
  paymentMethod: Stripe.PaymentMethod.Type;
  payoutFee: number | undefined;
}) => {
  if (!paymentMethod || !payoutFee) {
    throw new Error("Invalid payment method or payout fee.");
  }

  if (["link", "card"].includes(paymentMethod)) {
    return payoutFee + 0.03;
  }

  if (DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(paymentMethod)) {
    return payoutFee;
  }
};

import { DIRECT_DEBIT_PAYMENT_METHOD_TYPES } from "@/lib/constants/payouts";
import { CreditCard, GreekTemple } from "@dub/ui";
import Stripe from "stripe";

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

export const STRIPE_PAYMENT_METHODS = Object.freeze({
  link: {
    label: "Link",
    type: "link",
    icon: CreditCard,
    duration: "Instantly",
  },
  card: {
    label: "Card",
    type: "card",
    icon: CreditCard,
    duration: "Instantly",
  },
  us_bank_account: {
    label: "ACH",
    type: "us_bank_account",
    icon: GreekTemple,
    duration: "4 business days",
  },
  acss_debit: {
    label: "ACSS Debit",
    type: "acss_debit",
    icon: GreekTemple,
    duration: "5 business days",
  },
  sepa_debit: {
    label: "SEPA Debit",
    type: "sepa_debit",
    icon: GreekTemple,
    duration: "5 business days",
  },
});

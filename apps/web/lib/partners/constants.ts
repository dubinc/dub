import Stripe from "stripe";
import { PaymentMethodOption } from "../types";

export const PAYOUTS_SHEET_ITEMS_LIMIT = 10;
export const REFERRALS_EMBED_EARNINGS_LIMIT = 8;
export const CUSTOMER_PAGE_EVENTS_LIMIT = 8;

export const PAYOUT_FEES = {
  business: {
    direct_debit: 0.07,
    card: 0.1,
  },
  advanced: {
    direct_debit: 0.05,
    card: 0.08,
  },
  enterprise: {
    direct_debit: 0.03,
    card: 0.06,
  },
} as const;

export const DUB_MIN_PAYOUT_AMOUNT_CENTS = 10000;

// Direct debit payment types for Partner payout
export const DIRECT_DEBIT_PAYMENT_TYPES_INFO: {
  type: Stripe.PaymentMethod.Type;
  location: string;
  title: string;
  icon: string;
  option: PaymentMethodOption;
}[] = [
  {
    type: "us_bank_account",
    location: "US",
    title: "ACH",
    icon: "https://hatscripts.github.io/circle-flags/flags/us.svg",
    option: {},
  },
  {
    type: "acss_debit",
    location: "CA",
    title: "ACSS Debit",
    icon: "https://hatscripts.github.io/circle-flags/flags/ca.svg",
    option: {
      currency: "cad",
      mandate_options: {
        payment_schedule: "sporadic",
        transaction_type: "business",
      },
    },
  },
  {
    type: "sepa_debit",
    location: "EU",
    title: "SEPA Debit",
    icon: "https://hatscripts.github.io/circle-flags/flags/eu.svg",
    option: {},
  },
];

export const DIRECT_DEBIT_PAYMENT_METHOD_TYPES: Stripe.PaymentMethod.Type[] = [
  "us_bank_account",
  "acss_debit",
  "sepa_debit",
];

export const PAYMENT_METHOD_TYPES: Stripe.PaymentMethod.Type[] = [
  "card",
  "link",
  ...DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
];

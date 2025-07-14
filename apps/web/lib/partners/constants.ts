import Stripe from "stripe";
import { PaymentMethodOption } from "../types";

export const PAYOUTS_SHEET_ITEMS_LIMIT = 10;
export const REFERRALS_EMBED_EARNINGS_LIMIT = 8;
export const CUSTOMER_PAGE_EVENTS_LIMIT = 8;
export const PAYOUT_FAILURE_FEE_CENTS = 1000; // 10 USD
export const FOREX_MARKUP_RATE = 0.005; // 0.5%
export const MIN_WITHDRAWAL_AMOUNT_CENTS = 10000; // $100
export const BELOW_MIN_WITHDRAWAL_FEE_CENTS = 200; // $2

export const ALLOWED_MIN_WITHDRAWAL_AMOUNTS = [1000, 2500, 5000, 7500, 10000];
export const ALLOWED_MIN_PAYOUT_AMOUNTS = [0, 2000, 5000, 10000];

// Direct debit payment types for Partner payout
export const DIRECT_DEBIT_PAYMENT_TYPES_INFO: {
  type: Stripe.PaymentMethod.Type;
  location: string;
  title: string;
  icon: string;
  option: PaymentMethodOption;
  recommended?: boolean;
  enterpriseOnly?: boolean;
}[] = [
  {
    type: "us_bank_account",
    location: "US",
    title: "ACH",
    icon: "https://hatscripts.github.io/circle-flags/flags/us.svg",
    option: {},
    recommended: true,
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
    enterpriseOnly: true,
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

export const PROGRAM_IMPORT_SOURCES = [
  {
    id: "rewardful",
    value: "Rewardful",
    image: "https://assets.dub.co/misc/icons/rewardful.svg",
    helpUrl: "https://dub.co/help/article/migrating-from-rewardful",
  },
  {
    id: "tolt",
    value: "Tolt",
    image: "https://assets.dub.co/misc/icons/tolt.svg",
    helpUrl: "https://dub.co/help/article/migrating-from-tolt",
  },
] as const;

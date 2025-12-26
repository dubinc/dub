import Stripe from "stripe";
import { PaymentMethodOption } from "../types";

export const PAYOUTS_SHEET_ITEMS_LIMIT = 10;
export const PAYOUT_FAILURE_FEE_CENTS = 1000; // 10 USD
export const FAST_ACH_FEE_CENTS = 2500; // $25
export const FOREX_MARKUP_RATE = 0.005; // 0.5%

export const PAYOUT_HOLDING_PERIOD_DAYS = [0, 7, 14, 30, 60, 90];
export const ALLOWED_MIN_PAYOUT_AMOUNTS = [0, 1000, 2000, 5000, 10000];
export const INVOICE_MIN_PAYOUT_AMOUNT_CENTS = 1000; // $10
export const MIN_WITHDRAWAL_AMOUNT_CENTS = 1000; // $10
export const BELOW_MIN_WITHDRAWAL_FEE_CENTS = 50; // $0.50
export const MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS = 100; // $1 (doesn't make sense to force a withdrawal for less than $1)

export const ELIGIBLE_PAYOUTS_MAX_PAGE_SIZE = 500;
export const CUTOFF_PERIOD_MAX_PAYOUTS = 1000;

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

export const STRIPE_PAYMENT_METHOD_NORMALIZATION = {
  card: "card",
  link: "card",
  us_bank_account: "ach",
  acss_debit: "acss",
  sepa_debit: "sepa",
} as const;

export const INVOICE_PAYMENT_METHODS = Object.freeze({
  card: {
    label: "Card",
    duration: "Instantly",
  },
  ach: {
    label: "ACH",
    duration: "4 business days",
  },
  ach_fast: {
    label: "Fast ACH",
    duration: "2 business days",
  },
  sepa: {
    label: "SEPA Debit",
    duration: "5 business days",
  },
  acss: {
    label: "ACSS Debit",
    duration: "5 business days",
  },
});

export const INVOICE_AVAILABLE_PAYOUT_STATUSES = [
  "processed",
  "sent",
  "completed",
];

const VERIFIED_BANK_ACCOUNT_DESCRIPTION = {
  title: "Verified bank account",
  description:
    "This bank account is successfully verified and ready to receive payouts.",
  variant: "valid" as const,
};

export const BANK_ACCOUNT_STATUS_DESCRIPTIONS: Record<
  string,
  { title: string; description: string; variant: "valid" | "invalid" }
> = {
  verified: VERIFIED_BANK_ACCOUNT_DESCRIPTION,
  new: VERIFIED_BANK_ACCOUNT_DESCRIPTION,
  validated: VERIFIED_BANK_ACCOUNT_DESCRIPTION,
  verification_failed: {
    title: "Verification failed",
    description:
      "Bank account verification failed (e.g., microdeposit failure). Please update your bank account details to continue receiving payouts.",
    variant: "invalid",
  },
  tokenized_account_number_deactivated: {
    title: "Tokenized account deactivated",
    description:
      "The account uses a tokenized account number that has been deactivated due to expiration or revocation. Please reverify your bank account to continue receiving payouts.",
    variant: "invalid",
  },
  errored: {
    title: "Bank account error",
    description:
      "A payout sent to this bank account failed. Please update your bank account details to continue receiving payouts.",
    variant: "invalid",
  },
};

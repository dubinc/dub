export const PAYOUTS_SHEET_ITEMS_LIMIT = 10;
export const REFERRALS_EMBED_EARNINGS_LIMIT = 8;
export const CUSTOMER_PAGE_EVENTS_LIMIT = 8;

export const PAYOUT_FEES = {
  business: {
    ach: 0.07,
    card: 0.1,
  },
  advanced: {
    ach: 0.05,
    card: 0.08,
  },
  enterprise: {
    ach: 0.03,
    card: 0.06,
  },
};

export const DUB_MIN_PAYOUT_AMOUNT_CENTS = 10000;

// Direct debit payment types for Partner payout
export const DIRECT_DEBIT_PAYMENT_TYPES_INFO: {
  type: "us_bank_account" | "acss_debit" | "sepa_debit";
  location: string;
  title: string;
  icon: string;
  option: any;
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
      currency: "usd",
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

export const DIRECT_DEBIT_PAYMENT_TYPES = DIRECT_DEBIT_PAYMENT_TYPES_INFO.map(
  (type) => type.type,
);

export const PAYMENT_METHOD_TYPES = [
  "card",
  "link",
  ...DIRECT_DEBIT_PAYMENT_TYPES,
] as const;

export type PaymentMethodType =
  | (typeof DIRECT_DEBIT_PAYMENT_TYPES)[number]
  | "card"
  | "link";

export type DirectDebitPaymentMethodType =
  (typeof DIRECT_DEBIT_PAYMENT_TYPES)[number];

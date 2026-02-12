import { PartnerPayoutMethod } from "./types";

export const PAYOUT_METHOD_LABELS: Record<PartnerPayoutMethod, string> = {
  paypal: "PayPal",
  connect: "Stripe Express",
  stablecoin: "USDC wallet",
} as const;

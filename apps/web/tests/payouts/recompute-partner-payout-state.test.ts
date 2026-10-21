import { recomputePartnerPayoutState } from "@/lib/payouts/recompute-partner-payout-state";
import { describe, expect, it, vi } from "vitest";

// A PayPal-only partner never calls Stripe
vi.mock("@/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/lib/stripe/get-stripe-recipient-account", () => ({
  getStripeRecipientAccount: vi.fn(),
}));
vi.mock("@/lib/stripe/get-stripe-recipient-payout-method", () => ({
  getStripeRecipientPayoutMethod: vi.fn(),
}));

const paypalPartner = {
  stripeConnectId: null,
  stripeRecipientId: null,
  paypalEmail: "partner@example.com",
  tremendousEmail: null,
  payoutsEnabledAt: null,
  defaultPayoutMethod: null,
};

describe("recomputePartnerPayoutState", () => {
  it("enables payouts for an active payout method", async () => {
    const { payoutsEnabledAt, defaultPayoutMethod } =
      await recomputePartnerPayoutState({
        ...paypalPartner,
        networkStatus: "approved",
      });

    expect(payoutsEnabledAt).toBeInstanceOf(Date);
    expect(defaultPayoutMethod).toBe("paypal");
  });

  it("keeps payouts disabled for a partner banned from the network", async () => {
    const { payoutsEnabledAt, defaultPayoutMethod } =
      await recomputePartnerPayoutState({
        ...paypalPartner,
        networkStatus: "banned",
      });

    expect(payoutsEnabledAt).toBeNull();
    expect(defaultPayoutMethod).toBe("paypal");
  });
});

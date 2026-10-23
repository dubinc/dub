import {
  CARD_PAYOUT_HARD_COST_RATE,
  FAST_ACH_FEE_CENTS,
} from "@/lib/constants/payouts";
import { calculatePayoutFeeWithWaiver } from "@/lib/partners/calculate-payout-fee-with-waiver";
import { describe, expect, it } from "vitest";

describe("calculatePayoutFeeWithWaiver", () => {
  const payoutFee = 0.03; // 3% fee
  const cardPayoutFee = payoutFee + CARD_PAYOUT_HARD_COST_RATE;

  it("zero waiver limit (backward compatibility)", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFee,
      payoutFeeWaiverLimit: 0,
      payoutFeeWaiverUsage: 0,
      paymentMethod: "ach",
    });

    expect(result).toEqual({
      feeFreeAmount: 0,
      feeChargedAmount: 10000,
      feeWaiverRemaining: 0,
      fee: 300, // 3% of $100.00
    });
  });

  it("fully within waiver", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFee,
      payoutFeeWaiverLimit: 50000, // $500.00 limit
      payoutFeeWaiverUsage: 0, // nothing used yet
      paymentMethod: "ach",
    });

    expect(result).toEqual({
      fee: 0, // no fee charged
      feeFreeAmount: 10000, // entire amount is free
      feeChargedAmount: 0,
      feeWaiverRemaining: 50000,
    });
  });

  it("partially within waiver", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFee,
      payoutFeeWaiverLimit: 50000, // $500.00 limit
      payoutFeeWaiverUsage: 45000, // $450.00 already used
      paymentMethod: "ach",
    });

    expect(result).toEqual({
      fee: 150, // 3% of $50.00
      feeFreeAmount: 5000, // $50.00 free (remaining waiver)
      feeChargedAmount: 5000, // $50.00 charged
      feeWaiverRemaining: 5000,
    });
  });

  it("waiver exhausted", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFee,
      payoutFeeWaiverLimit: 50000, // $500.00 limit
      payoutFeeWaiverUsage: 50000, // fully used
      paymentMethod: "ach",
    });

    expect(result).toEqual({
      fee: 300, // 3% of $100.00
      feeFreeAmount: 0,
      feeChargedAmount: 10000,
      feeWaiverRemaining: 0,
    });
  });

  it("includes fast ACH fee for ach_fast payment method", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000,
      payoutFeeWaiverLimit: 50000,
      payoutFeeWaiverUsage: 45000,
      payoutFee,
      paymentMethod: "ach_fast",
    });

    expect(result).toEqual({
      fee: 150 + FAST_ACH_FEE_CENTS, // 3% of $50.00 + fast ACH fee
      feeFreeAmount: 5000,
      feeChargedAmount: 5000,
      feeWaiverRemaining: 5000,
    });
  });

  it("card payment fully within waiver still charges hard cost", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFee: cardPayoutFee,
      payoutFeeWaiverLimit: 50000,
      payoutFeeWaiverUsage: 0,
      paymentMethod: "card",
    });

    expect(result).toEqual({
      fee: 300, // 3% card hard cost on full amount
      feeFreeAmount: 10000,
      feeChargedAmount: 0,
      feeWaiverRemaining: 50000,
    });
  });

  it("card payment partially within waiver charges hard cost on full amount", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFee: cardPayoutFee,
      payoutFeeWaiverLimit: 50000,
      payoutFeeWaiverUsage: 45000,
      paymentMethod: "card",
    });

    expect(result).toEqual({
      fee: 450, // 3% of $100.00 + 3% of $50.00
      feeFreeAmount: 5000,
      feeChargedAmount: 5000,
      feeWaiverRemaining: 5000,
    });
  });

  it("card payment with exhausted waiver charges full fee", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000,
      payoutFee: cardPayoutFee,
      payoutFeeWaiverLimit: 50000,
      payoutFeeWaiverUsage: 50000,
      paymentMethod: "card",
    });

    expect(result).toEqual({
      fee: 600, // 6% of $100.00
      feeFreeAmount: 0,
      feeChargedAmount: 10000,
      feeWaiverRemaining: 0,
    });
  });
});

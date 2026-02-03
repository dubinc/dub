import { calculatePayoutFeeWithWaiver } from "@/lib/partners/calculate-payout-fee-with-waiver";
import { describe, expect, it } from "vitest";

describe("calculatePayoutFeeWithWaiver", () => {
  const payoutFee = 0.02; // 2% fee

  it("zero waiver limit (backward compatibility)", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFeeWaiverLimit: 0,
      payoutFeeWaivedUsage: 0,
      payoutFee,
    });

    expect(result).toEqual({
      feeFreeAmount: 0,
      feeChargedAmount: 10000,
      freeTierRemaining: 0,
      fee: 200, // 2% of $100.00
    });
  });

  it("fully within waiver", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFeeWaiverLimit: 50000, // $500.00 limit
      payoutFeeWaivedUsage: 0, // nothing used yet
      payoutFee,
    });

    expect(result).toEqual({
      feeFreeAmount: 10000, // entire amount is free
      feeChargedAmount: 0,
      freeTierRemaining: 50000,
      fee: 0, // no fee charged
    });
  });

  it("partially within waiver", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFeeWaiverLimit: 50000, // $500.00 limit
      payoutFeeWaivedUsage: 45000, // $450.00 already used
      payoutFee,
    });

    expect(result).toEqual({
      feeFreeAmount: 5000, // $50.00 free (remaining waiver)
      feeChargedAmount: 5000, // $50.00 charged
      freeTierRemaining: 5000,
      fee: 100, // 2% of $50.00
    });
  });

  it("waiver exhausted", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFeeWaiverLimit: 50000, // $500.00 limit
      payoutFeeWaivedUsage: 50000, // fully used
      payoutFee,
    });

    expect(result).toEqual({
      feeFreeAmount: 0,
      feeChargedAmount: 10000,
      freeTierRemaining: 0,
      fee: 200, // 2% of $100.00
    });
  });

  it("includes fastAchFee when provided", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000,
      payoutFeeWaiverLimit: 50000,
      payoutFeeWaivedUsage: 45000,
      payoutFee,
      fastAchFee: 50,
    });

    expect(result).toEqual({
      feeFreeAmount: 5000,
      feeChargedAmount: 5000,
      freeTierRemaining: 5000,
      fee: 150, // 2% of $50.00 + $0.50 fast ACH fee
    });
  });
});

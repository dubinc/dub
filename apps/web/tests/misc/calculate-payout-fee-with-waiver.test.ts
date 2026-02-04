import { calculatePayoutFeeWithWaiver } from "@/lib/partners/calculate-payout-fee-with-waiver";
import { describe, expect, it } from "vitest";

describe("calculatePayoutFeeWithWaiver", () => {
  const payoutFee = 0.03; // 3% fee

  it("zero waiver limit (backward compatibility)", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000, // $100.00
      payoutFee,
      payoutFeeWaiverLimit: 0,
      payoutFeeWaiverUsage: 0,
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
    });

    expect(result).toEqual({
      fee: 300, // 3% of $100.00
      feeFreeAmount: 0,
      feeChargedAmount: 10000,
      feeWaiverRemaining: 0,
    });
  });

  it("includes fastAchFee when provided", () => {
    const result = calculatePayoutFeeWithWaiver({
      payoutAmount: 10000,
      payoutFeeWaiverLimit: 50000,
      payoutFeeWaiverUsage: 45000,
      payoutFee,
      fastAchFee: 50,
    });

    expect(result).toEqual({
      fee: 200, // 3% of $50.00 + $0.50 fast ACH fee
      feeFreeAmount: 5000,
      feeChargedAmount: 5000,
      feeWaiverRemaining: 5000,
    });
  });
});

import {
  CARD_PAYOUT_HARD_COST_RATE,
  FAST_ACH_FEE_CENTS,
} from "@/lib/constants/payouts";
import { PaymentMethod } from "@prisma/client";

export interface PayoutFeeWithWaiverParams {
  payoutAmount: number;
  payoutFee: number;
  payoutFeeWaiverLimit: number;
  payoutFeeWaiverUsage: number;
  paymentMethod: PaymentMethod;
}

// Calculates payout fee with tiered waiver logic
export function calculatePayoutFeeWithWaiver({
  payoutAmount,
  payoutFee,
  payoutFeeWaiverLimit,
  payoutFeeWaiverUsage,
  paymentMethod,
}: PayoutFeeWithWaiverParams) {
  const nonWaivableFeeRate =
    paymentMethod === "card" ? CARD_PAYOUT_HARD_COST_RATE : 0;
  const waivableFeeRate = payoutFee - nonWaivableFeeRate;
  const fastAchFee = paymentMethod === "ach_fast" ? FAST_ACH_FEE_CENTS : 0;

  let feeWaiverRemaining: number;
  let feeFreeAmount: number;
  let feeChargedAmount: number;

  if (payoutFeeWaiverLimit === 0) {
    feeWaiverRemaining = 0;
    feeFreeAmount = 0;
    feeChargedAmount = payoutAmount;
  } else {
    feeWaiverRemaining = Math.max(
      0,
      payoutFeeWaiverLimit - payoutFeeWaiverUsage,
    );
    feeFreeAmount = Math.min(payoutAmount, feeWaiverRemaining);
    feeChargedAmount = payoutAmount - feeFreeAmount;
  }

  const fee =
    Math.round(payoutAmount * nonWaivableFeeRate) +
    Math.round(feeChargedAmount * waivableFeeRate) +
    fastAchFee;

  return {
    fee,
    feeFreeAmount,
    feeChargedAmount,
    feeWaiverRemaining,
  };
}

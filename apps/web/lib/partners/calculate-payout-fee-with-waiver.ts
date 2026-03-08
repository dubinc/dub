export interface PayoutFeeWithWaiverParams {
  payoutAmount: number;
  payoutFee: number;
  payoutFeeWaiverLimit: number;
  payoutFeeWaiverUsage: number;
  fastAchFee?: number;
}

// Calculates payout fee with tiered waiver logic
export function calculatePayoutFeeWithWaiver({
  payoutAmount,
  payoutFee,
  payoutFeeWaiverLimit,
  payoutFeeWaiverUsage,
  fastAchFee = 0,
}: PayoutFeeWithWaiverParams) {
  if (payoutFeeWaiverLimit === 0) {
    return {
      fee: Math.round(payoutAmount * payoutFee) + fastAchFee,
      feeFreeAmount: 0,
      feeChargedAmount: payoutAmount,
      feeWaiverRemaining: 0,
    };
  }

  // Split the payout amount between free tier (0% fee) and fee charged (normal rate)
  const feeWaiverRemaining = Math.max(
    0,
    payoutFeeWaiverLimit - payoutFeeWaiverUsage,
  );
  const feeFreeAmount = Math.min(payoutAmount, feeWaiverRemaining);
  const feeChargedAmount = payoutAmount - feeFreeAmount;

  return {
    fee: Math.round(feeChargedAmount * payoutFee) + fastAchFee,
    feeFreeAmount,
    feeChargedAmount,
    feeWaiverRemaining,
  };
}
